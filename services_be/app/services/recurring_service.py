import asyncio
import logging
from datetime import datetime, timedelta
from bson import ObjectId
from app.db import db

logger = logging.getLogger(__name__)

async def check_and_create_recurring_tickets():
    """Loop to periodically check and create tickets from templates"""
    while True:
        try:
            now = datetime.now()
            # Find definitions that are due
            due_tickets = list(db.recurring_tickets_collection.find({
                "next_run": {"$lte": now}
            }))

            for rt in due_tickets:
                try:
                    template_id = rt.get("template_id")
                    if not template_id:
                        continue

                    # Fetch template
                    template = db.ticket_templates_collection.find_one({"_id": ObjectId(template_id)})
                    if not template:
                        logger.warning(f"Template {template_id} not found for recurring ticket {rt['_id']}")
                        # Push next run to avoid infinite loop
                        db.recurring_tickets_collection.update_one(
                            {"_id": rt["_id"]},
                            {"$set": {"next_run": now + timedelta(days=1)}}
                        )
                        continue

                    # Create Ticket
                    docket_num = db.get_next_docket_number()
                    input_date = datetime.now().strftime("%d-%m-%Y %I:%M %p")

                    ticket_doc = {
                        "Docket_Number": docket_num,
                        "Subject": template.get("default_subject", "Scheduled Task"),
                        "Breif": template.get("default_description", "Scheduled recurring ticket execution"),
                        "File": "No file was Uploaded",
                        "Department": template.get("department"),
                        "Data_Filled_by": "System (Recurring Scheduler)",
                        "User_Department": "System Queue",
                        "Present_Status": "New Service Request",
                        "Actions_Taken": [],
                        "Old_Status": "",
                        "Ticket_Closed": False,
                        "Priority": rt.get("priority", "Medium"),
                        "Tags": rt.get("tags", []),
                        "Watchers": [],
                        "Assigned_To": None,
                        "Merged_Into": None,
                        "Transfer_History": [],
                        "Input_Date": input_date,
                        "SLA_Deadline": db.get_sla_deadline(template.get("department"), now)
                    }

                    db.tickets_collection.insert_one(ticket_doc)

                    # Audit log
                    db.write_audit_log(
                        docket_number=docket_num,
                        user_emp_id="SYSTEM",
                        user_name="System",
                        action="created",
                        field="status",
                        new_value="New Service Request"
                    )

                    # Calculate next run
                    schedule = rt.get("cron_schedule", "daily").lower()
                    if "daily" in schedule:
                        next_run = now + timedelta(days=1)
                    elif "weekly" in schedule:
                        next_run = now + timedelta(weeks=1)
                    elif "monthly" in schedule:
                        next_run = now + timedelta(days=30)
                    else:
                        next_run = now + timedelta(days=1) # Fallback

                    # Update next run in DB
                    db.recurring_tickets_collection.update_one(
                        {"_id": rt["_id"]},
                        {"$set": {"next_run": next_run}}
                    )

                    logger.info(f"Recurring Ticket Created successfully! Docket: {docket_num}")

                except Exception as ex:
                    logger.error(f"Error executing recurring ticket {rt.get('_id')}: {ex}")

        except Exception as e:
            logger.error(f"Error in recurring tickets loop: {e}")

        # Sleep for 10 minutes between checks
        await asyncio.sleep(600)


async def start_recurring_scheduler():
    """Starts the background task for recurring tickets"""
    loop = asyncio.get_event_loop()
    loop.create_task(check_and_create_recurring_tickets())
    logger.info("Recurring ticket background scheduler started")
