import json
import logging
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from app.db import db
from app.middleware.auth import get_current_user, require_admin
from app.utils import parse_request_payload

logger = logging.getLogger(__name__)
router = APIRouter()

# Try to initialize text index on knowledge base collection
try:
    db.knowledge_base_collection.create_index(
        [("title", "text"), ("content", "text"), ("summary", "text")],
        name="kb_text_search_index",
        default_language="english"
    )
except Exception as e:
    logger.warning(f"KB text index creation warning: {e}")


@router.get("/kb/articles")
def get_articles(
    department: str = Query(None, description="Filter by department"),
    current_user: dict = Depends(get_current_user)
):
    """Returns KB articles, optionally filtered by department."""
    try:
        filt = {}
        if department:
            filt["department"] = department

        articles = list(db.knowledge_base_collection.find(filt))
        for a in articles:
            a["id"] = str(a.pop("_id"))
            if isinstance(a.get("created_at"), datetime):
                a["created_at"] = a["created_at"].isoformat()
            if isinstance(a.get("updated_at"), datetime):
                a["updated_at"] = a["updated_at"].isoformat()
        return articles
    except Exception as e:
        logger.error(f"Failed to fetch KB articles: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch articles")


@router.post("/kb/articles")
def create_article(request: Request, current_user: dict = Depends(get_current_user)):
    """Creates a new KB article."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    if isinstance(payload, str):
        payload = json.loads(payload)

    title = payload.get("title", "").strip()
    department = payload.get("department", "").strip()
    content = payload.get("content", "").strip()
    summary = payload.get("summary", "").strip()

    if not title or not department or not content:
        raise HTTPException(status_code=400, detail="title, department, and content are required")

    try:
        article_doc = {
            "title": title,
            "department": department,
            "content": content,
            "summary": summary or (content[:150] + "..." if len(content) > 150 else content),
            "created_by": current_user["name"],
            "created_by_emp_id": current_user["emp_id"],
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        result = db.knowledge_base_collection.insert_one(article_doc)
        return {"status": "ok", "id": str(result.inserted_id)}
    except Exception as e:
        logger.error(f"Failed to create article: {e}")
        raise HTTPException(status_code=500, detail="Failed to create article")


@router.put("/kb/articles/{article_id}")
def update_article(article_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Updates an existing KB article. Creators and admins only."""
    payload = parse_request_payload(request)
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")
    if isinstance(payload, str):
        payload = json.loads(payload)

    title = payload.get("title", "").strip()
    department = payload.get("department", "").strip()
    content = payload.get("content", "").strip()
    summary = payload.get("summary", "").strip()

    try:
        article = db.knowledge_base_collection.find_one({"_id": ObjectId(article_id)})
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        # Check permissions: admin or owner can update
        is_admin = current_user.get("role") == "admin"
        created_by_emp_id = article.get("created_by_emp_id")
        created_by_name = article.get("created_by")
        is_owner = (created_by_emp_id == current_user["emp_id"]) or (not created_by_emp_id and created_by_name == current_user["name"])

        if not is_admin and not is_owner:
            raise HTTPException(
                status_code=403,
                detail="Access forbidden: You can only edit your own articles"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check permissions for article update: {e}")
        raise HTTPException(status_code=500, detail="Permission check failed")

    update_fields = {}
    if title:
        update_fields["title"] = title
    if department:
        update_fields["department"] = department
    if content:
        update_fields["content"] = content
        if not summary:
            update_fields["summary"] = content[:150] + "..." if len(content) > 150 else content
    if summary:
        update_fields["summary"] = summary

    if not update_fields:
        raise HTTPException(status_code=400, detail="Nothing to update")

    update_fields["updated_at"] = datetime.now()

    try:
        result = db.knowledge_base_collection.update_one(
            {"_id": ObjectId(article_id)},
            {"$set": update_fields}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Article not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update article {article_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update article")


@router.delete("/kb/articles/{article_id}")
def delete_article(article_id: str, current_user: dict = Depends(get_current_user)):
    """Deletes a KB article. Creators and admins only."""
    try:
        article = db.knowledge_base_collection.find_one({"_id": ObjectId(article_id)})
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        # Check permissions: admin or owner can delete
        is_admin = current_user.get("role") == "admin"
        created_by_emp_id = article.get("created_by_emp_id")
        created_by_name = article.get("created_by")
        is_owner = (created_by_emp_id == current_user["emp_id"]) or (not created_by_emp_id and created_by_name == current_user["name"])

        if not is_admin and not is_owner:
            raise HTTPException(
                status_code=403,
                detail="Access forbidden: You can only delete your own articles"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check permissions for article delete: {e}")
        raise HTTPException(status_code=500, detail="Permission check failed")

    try:
        result = db.knowledge_base_collection.delete_one({"_id": ObjectId(article_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Article not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete article {article_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete article")


@router.get("/kb/search")
def search_articles(q: str = Query(..., min_length=2), current_user: dict = Depends(get_current_user)):
    """Searches KB articles using text search or fallback regex search."""
    try:
        # 1. Text Search
        results = list(db.knowledge_base_collection.find(
            {"$text": {"$search": q}},
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).limit(5))

        if not results:
            # Fallback to Regex search
            import re
            regex = {"$regex": re.escape(q), "$options": "i"}
            results = list(db.knowledge_base_collection.find(
                {"$or": [{"title": regex}, {"content": regex}, {"summary": regex}]}
            ).limit(5))

        for a in results:
            a["id"] = str(a.pop("_id"))
            a.pop("score", None)
            if isinstance(a.get("created_at"), datetime):
                a["created_at"] = a["created_at"].isoformat()
            if isinstance(a.get("updated_at"), datetime):
                a["updated_at"] = a["updated_at"].isoformat()

        return results
    except Exception as e:
        logger.error(f"Failed to search KB articles: {e}")
        return []
