import os
import re
import asyncio
import logging
from datetime import datetime, timedelta
from app.db import db
from app.config import settings
from app.services.email_service import email_service, DEPARTMENT_EMAIL_MAPPING

logger = logging.getLogger(__name__)

def parse_date(date_str):
    if not date_str:
        return None
    date_str = re.sub(r'\s+', ' ', date_str.strip())
    formats = [
        "%d-%m-%Y %I:%M %p",
        "%d-%m-%Y %I:%M%p",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.upper(), fmt)
        except ValueError:
            pass
    return None

def get_first_action_date(action_batch):
    if not action_batch:
        return None
    if isinstance(action_batch, list):
        for item in action_batch:
            d = get_first_action_date(item)
            if d:
                return d
    elif isinstance(action_batch, dict):
        return action_batch.get("Date")
    return None

def send_reminder_email(ticket: dict, days_elapsed: int, background_tasks=None, cc_email=None):
    """Sends a reminder email to the concerned department of the ticket."""
    dept_name = ticket.get("Department")
    docket_no = ticket.get("Docket_Number")
    subject = f"Reminder: Action Required on Docket No- {docket_no}"
    
    email_info = DEPARTMENT_EMAIL_MAPPING.get(dept_name)
    if not email_info:
        logger.warning(f"No email configuration found for department: {dept_name}. Skipping email.")
        return False

    to_recipients = email_info["to"]
    cc_recipients = list(email_info["cc"]) if email_info.get("cc") else []
    if cc_email and "@" in cc_email:
        cc_recipients.append(cc_email)
    
    raised_by = ticket.get("Data_Filled_by") or "Unknown"
    input_date = ticket.get("Input_Date") or "Unknown"
    ticket_subject = ticket.get("Subject") or "No Subject"

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="background-color: #ef4444; color: #ffffff; padding: 20px; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Ticket Pending Reminder</h2>
                </div>
                <div style="padding: 24px; background-color: #ffffff;">
                    <p style="margin-top: 0;">Dear Team,</p>
                    <p>This is a reminder that the following service request has been pending in your department queue.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 35%;">Docket Number:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #ef4444; font-weight: bold;">{docket_no}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Subject:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">{ticket_subject}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Days Elapsed:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #ef4444; font-weight: bold;">{days_elapsed} days</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Raised By:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">{raised_by}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Date:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">{input_date}</td>
                        </tr>
                    </table>
                    
                    <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                        <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.5;">
                            It has been <b>{days_elapsed}</b> days since this ticket was raised in the service request portal. 
                            You are requested to take immediate action to resolve this issue and close the ticket.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="{settings.FRONTEND_BASE_URL}/ticket/{docket_no}" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">View Ticket in Portal</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">This is an automated, system-generated email. Please do not reply directly to this mail.</p>
                </div>
            </div>
        </body>
    </html>
    """

    if background_tasks:
        background_tasks.add_task(
            email_service._send_exchange_mail,
            subject=subject,
            html_body=html_body,
            to_recipients=to_recipients,
            cc_recipients=cc_recipients
        )
        return True
    else:
        return email_service._send_exchange_mail(
            subject=subject,
            html_body=html_body,
            to_recipients=to_recipients,
            cc_recipients=cc_recipients
        )

async def scan_and_send_reminders():
    """Scans all unresolved tickets and sends 7-day increment reminders."""
    now = datetime.now()
    
    # Query unresolved, non-deleted tickets
    tickets_cursor = db.tickets_collection.find({
        "Present_Status": {"$nin": ["Resolved", "Closed"]},
        "is_deleted": {"$ne": True}
    })
    
    count = 0
    for t in tickets_cursor:
        docket_no = t.get("Docket_Number")
        input_date = parse_date(t.get("Input_Date"))
        if not input_date:
            logger.warning(f"Could not parse Input_Date for ticket Docket No {docket_no}")
            continue
            
        days_elapsed = (now - input_date).days
        if days_elapsed >= 7:
            target_reminder_day = (days_elapsed // 7) * 7
            last_sent = t.get("Last_Reminder_Sent_Days", 0)
            
            if last_sent < target_reminder_day:
                logger.info(f"Sending automated {target_reminder_day}-day reminder for ticket Docket No {docket_no} (age: {days_elapsed} days)")
                success = send_reminder_email(t, days_elapsed)
                if success:
                    db.tickets_collection.update_one(
                        {"Docket_Number": docket_no},
                        {"$set": {
                            "Last_Reminder_Sent_Days": target_reminder_day,
                            "Last_Reminder_Date": now.strftime("%d-%m-%Y %I:%M %p")
                        }}
                    )
                    count += 1
    
    logger.info(f"Automated reminder scan complete. Sent {count} reminders.")

async def start_reminder_scheduler():
    """Starts the asyncio background scheduler for automated reminders."""
    async def periodic_check():
        # Delay the first run slightly to allow app startup to settle
        await asyncio.sleep(15)
        while True:
            try:
                await scan_and_send_reminders()
            except Exception as e:
                logger.error(f"Error in automatic reminder scan: {e}")
            # Run scan every 12 hours (43200 seconds)
            await asyncio.sleep(43200)

    asyncio.create_task(periodic_check())
