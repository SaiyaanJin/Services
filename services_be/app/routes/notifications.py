import asyncio
import json
import logging
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from app.db import db
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Global dict mapping emp_id -> list of asyncio.Queue for SSE fan-out
_sse_queues: dict[str, list[asyncio.Queue]] = {}

def _bson_to_json(obj):
    """Convert MongoDB documents (with ObjectId) to JSON-serializable dict"""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


async def broadcast_notification(emp_id: str, payload: dict):
    """Push a notification event to all SSE connections for a given emp_id"""
    queues = _sse_queues.get(emp_id, [])
    for q in queues:
        try:
            await q.put(payload)
        except Exception:
            pass


async def broadcast_to_multiple(emp_ids: list[str], payload: dict):
    """Broadcast notification to multiple employees"""
    for emp_id in emp_ids:
        await broadcast_notification(emp_id, payload)


@router.get("/notifications/stream")
async def notifications_stream(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    SSE endpoint. Client connects once; server pushes notification events as they occur.
    Each event: data: { type, docket_number, message, timestamp }
    """
    emp_id = current_user["emp_id"]
    queue: asyncio.Queue = asyncio.Queue()

    # Register this connection
    if emp_id not in _sse_queues:
        _sse_queues[emp_id] = []
    _sse_queues[emp_id].append(queue)

    async def event_generator():
        # Send a heartbeat comment immediately to establish connection
        yield "data: {\"type\": \"connected\", \"message\": \"Notification stream connected\"}\n\n"
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                try:
                    # Wait for notification with timeout (heartbeat every 30s)
                    payload = await asyncio.wait_for(queue.get(), timeout=30)
                    data = json.dumps(payload, default=_bson_to_json)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    # Send heartbeat comment to keep connection alive
                    yield ": heartbeat\n\n"
        finally:
            # Clean up queue on disconnect
            if emp_id in _sse_queues and queue in _sse_queues[emp_id]:
                _sse_queues[emp_id].remove(queue)
            if emp_id in _sse_queues and not _sse_queues[emp_id]:
                del _sse_queues[emp_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


@router.get("/notifications")
def get_notifications(current_user: dict = Depends(get_current_user)):
    """Returns last 30 notifications for the current user (unread first, then recent)"""
    emp_id = current_user["emp_id"]
    try:
        docs = list(db.notifications_collection.find(
            {"recipient_emp_id": emp_id},
            {"_id": 1, "type": 1, "message": 1, "docket_number": 1, "read": 1, "created_at": 1}
        ).sort([("read", 1), ("created_at", -1)]).limit(30))

        for doc in docs:
            doc["id"] = str(doc.pop("_id"))
            if isinstance(doc.get("created_at"), datetime):
                doc["created_at"] = doc["created_at"].isoformat()

        return docs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notifications: {e}")


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a single notification as read"""
    emp_id = current_user["emp_id"]
    try:
        result = db.notifications_collection.update_one(
            {"_id": ObjectId(notification_id), "recipient_emp_id": emp_id},
            {"$set": {"read": True}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notification: {e}")


@router.post("/notifications/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications for the current user as read"""
    emp_id = current_user["emp_id"]
    try:
        db.notifications_collection.update_many(
            {"recipient_emp_id": emp_id, "read": False},
            {"$set": {"read": True}}
        )
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark all read: {e}")


@router.delete("/notifications/clear")
def clear_read_notifications(current_user: dict = Depends(get_current_user)):
    """Delete all read notifications for the current user"""
    emp_id = current_user["emp_id"]
    try:
        db.notifications_collection.delete_many({"recipient_emp_id": emp_id, "read": True})
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear notifications: {e}")
