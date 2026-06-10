# -*- coding: utf-8 -*-
import logging
import jwt as pyjwt
from datetime import datetime, timedelta
from exchangelib import Credentials, Account, Configuration, DELEGATE, Message, HTMLBody
from fastapi import BackgroundTasks
from app.config import settings

logger = logging.getLogger(__name__)

# Department to Email addresses mapping (TO and CC)
# Keys are normalized to match the database values
DEPARTMENT_EMAIL_MAPPING = {
    "Human Resource : Human Resource": {
        "to": ["erldchr.gr@grid-india.in", "varshabyahut@grid-india.in"],
        "cc": []
    },
    "Contract Services : Contract Services": {
        "to": ["erldc.cs@grid-india.in"],
        "cc": []
    },
    "Finance : Finance & Accounts": {
        "to": ["vivek.upadhyay@grid-india.in","mdas@grid-india.in", "jatan@grid-india.in", "sumit.prasad@grid-india.in", "diptikanta@grid-india.in"],
        "cc": []
    },
    "Cyber Security : Cyber Security": {
        "to": ["ciso-erldc@grid-india.in"],
        "cc": []
    },
    "System Operation : Post Despatch": {
        "to": ["erldcso@grid-india.in"],
        "cc": []
    },
    "System Operation : Real Time Operation": {
        "to": ["erldcso@grid-india.in"],
        "cc": []
    },
    "System Operation : Operational Planning": {
        "to": ["erldcso@grid-india.in"],
        "cc": []
    },
    "Market Operation : Open Access": {
        "to": ["erldc.mo@grid-india.in"],
        "cc": []
    },
    "Market Operation : Market Coordination": {
        "to": ["erldc.mo@grid-india.in"],
        "cc": []
    },
    "Market Operation : Interface Energy Metering, Accounting & Settlement": {
        "to": ["erldc.mo@grid-india.in"],
        "cc": []
    },
    "Market Operation : Regulatory Affairs, Market Operation planning & Coordination": {
        "to": ["erldc.mo@grid-india.in"],
        "cc": []
    },
    "Logistics : TS": {
        "to": ["mkmallick@grid-india.in", "avijitroy@grid-india.in"],
        "cc": [ ]
    },
    "Logistics : IT": {
        "to": ["erldcitgr@grid-india.in"],
        "cc": []
    },
    "Logistics : Communication": {
        "to": ["erldccommunication@grid-india.in"],
        "cc": []
    },
    "Logistics : OT (Decision Support)": {
        "to": ["erldcscada@grid-india.in"],
        "cc": []
    }
}

# Add SCADA mapping aliases for SCADA
DEPARTMENT_EMAIL_MAPPING["SCADA"] = DEPARTMENT_EMAIL_MAPPING["Logistics : OT (Decision Support)"]

class EmailService:
    def __init__(self):
        self.account = None
        self._initialize_account()

    def _initialize_account(self):
        """Initialize connection to the Exchange server using credentials from configuration"""
        try:
            if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
                logger.warning("Mail credentials are empty. Email service will run in mock/dry-run mode.")
                return

            credentials = Credentials(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            config = Configuration(server=settings.MAIL_SERVER, credentials=credentials)
            self.account = Account(
                primary_smtp_address=settings.MAIL_SMTP_ADDRESS,
                config=config,
                autodiscover=False,
                access_type=DELEGATE
            )
            logger.info("Email service Exchange account successfully initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Exchange account: {e}. Email service will fail back gracefully.")

    def _send_exchange_mail(self, subject: str, html_body: str, to_recipients: list, cc_recipients: list = None):
        """Helper to physically send the email using Exchange API"""
        if not self.account:
            logger.warning(f"[MOCK MAIL] TO: {to_recipients}, CC: {cc_recipients}, SUBJECT: {subject}")
            return False

        try:
            m = Message(
                account=self.account,
                subject=subject,
                body='',
                to_recipients=to_recipients,
                cc_recipients=cc_recipients or []
            )
            m.body = HTMLBody(html_body)
            m.send()
            logger.info(f"Email sent successfully: '{subject}' to {to_recipients}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email '{subject}': {e}")
            return False

    def send_new_ticket_email(self, ticket: dict, background_tasks: BackgroundTasks, cc_email: str = None):
        """Asynchronously send email notification to target department about a new ticket"""
        dept_name = ticket.get("Department")
        docket_no = ticket.get("Docket_Number")
        subject = f"New Service Request: {ticket.get('Subject')} (Docket No- {docket_no})"
        
        email_info = DEPARTMENT_EMAIL_MAPPING.get(dept_name)
        if not email_info:
            logger.warning(f"No email configuration found for department: {dept_name}. Skipping email.")
            return
 
        to_recipients = email_info["to"]
        cc_recipients = list(email_info["cc"]) if email_info.get("cc") else []
        if cc_email and "@" in cc_email:
            cc_recipients.append(cc_email)

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <div style="background-color: #4f46e5; color: #ffffff; padding: 20px; text-align: center;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: bold;">New Service Request</h2>
                    </div>
                    <div style="padding: 24px; background-color: #ffffff;">
                        <p style="margin-top: 0;">Dear Team,</p>
                        <p>A new service request has been logged for your department.</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 35%;">Docket Number:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #4f46e5; font-weight: bold;">{docket_no}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Subject:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">{ticket.get('Subject')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Raised By:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">{ticket.get('Data_Filled_by')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Department:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">{ticket.get('User_Department')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Date:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">{ticket.get('Input_Date')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Description:</td>
                                <td style="padding: 10px 0; white-space: pre-wrap;">{ticket.get('Breif') or ticket.get('description')}</td>
                            </tr>
                        </table>
                        
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="{settings.FRONTEND_BASE_URL}/ticket/{docket_no}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">View Ticket in Portal</a>
                        </div>
                        
                        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">This is an automated, system-generated email. Please do not reply directly to this mail.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        background_tasks.add_task(
            self._send_exchange_mail,
            subject=subject,
            html_body=html_body,
            to_recipients=to_recipients,
            cc_recipients=cc_recipients
        )

    def send_status_update_email(self, ticket: dict, status_choice: str, edited_by: str, issuer_email: str, background_tasks: BackgroundTasks, cc_email: str = None):
        """Asynchronously notify the ticket creator about changes to the ticket status"""
        if not issuer_email:
            logger.warning(f"No issuer email provided for ticket {ticket.get('Docket_Number')}. Skipping notification email.")
            return

        docket_no = ticket.get("Docket_Number")
        subject = f"Service Request Updated: {ticket.get('Subject')} (Docket No- {docket_no}) is marked {status_choice}"

        cc_recipients = []
        if cc_email and "@" in cc_email:
            cc_recipients.append(cc_email)

        csat_block = ""
        if status_choice == "Resolved":
            csat_block = f"""
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #16a34a; font-size: 14px;">Please rate the resolution of your service request:</p>
                <div style="font-size: 24px; letter-spacing: 12px; margin: 10px 0;">
                    <a href="{settings.FRONTEND_BASE_URL}/csat?token={self.generate_csat_token(docket_no)}&rating=1" style="text-decoration: none;" title="1 Star">&#11088;</a>
                    <a href="{settings.FRONTEND_BASE_URL}/csat?token={self.generate_csat_token(docket_no)}&rating=2" style="text-decoration: none;" title="2 Stars">&#11088;</a>
                    <a href="{settings.FRONTEND_BASE_URL}/csat?token={self.generate_csat_token(docket_no)}&rating=3" style="text-decoration: none;" title="3 Stars">&#11088;</a>
                    <a href="{settings.FRONTEND_BASE_URL}/csat?token={self.generate_csat_token(docket_no)}&rating=4" style="text-decoration: none;" title="4 Stars">&#11088;</a>
                    <a href="{settings.FRONTEND_BASE_URL}/csat?token={self.generate_csat_token(docket_no)}&rating=5" style="text-decoration: none;" title="5 Stars">&#11088;</a>
                </div>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #16a34a;">Click on a star above to submit your rating directly.</p>
            </div>
            """

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <div style="background-color: #10b981; color: #ffffff; padding: 20px; text-align: center;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Service Request Update</h2>
                    </div>
                    <div style="padding: 24px; background-color: #ffffff;">
                        <p style="margin-top: 0;">Dear Sir/Madam,</p>
                        <p>Your service request (Docket No- <b>{docket_no}</b>) has been updated.</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 35%;">New Status:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #10b981; font-weight: bold; font-size: 16px;">{status_choice}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Updated By:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">{ticket.get('Department')} Department ({edited_by})</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Subject:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">{ticket.get('Subject')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Description:</td>
                                <td style="padding: 10px 0; white-space: pre-wrap;">{ticket.get('Breif') or ticket.get('description')}</td>
                            </tr>
                        </table>
                        
                        {csat_block}

                        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                            <p style="margin: 0; font-weight: bold; font-size: 14px;">Next Steps:</p>
                            <p style="margin: 4px 0 0 0; font-size: 13px;">Please log in to the portal to Accept/Deny the service request status. If accepted, the ticket will close.</p>
                        </div>
                        
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="{settings.FRONTEND_BASE_URL}/ticket/{docket_no}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">View Ticket in Portal</a>
                        </div>
                        
                        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">This is an automated, system-generated email. Please do not reply directly to this mail.</p>
                    </div>
                </div>
            </body>
        </html>
        """

        background_tasks.add_task(
            self._send_exchange_mail,
            subject=subject,
            html_body=html_body,
            to_recipients=[issuer_email],
            cc_recipients=cc_recipients
        )

    def send_watcher_notification(self, ticket: dict, new_status: str, changed_by: str, background_tasks: BackgroundTasks, exclude_email: str = None):
        """Send email to all ticket watchers when status changes"""
        watchers = ticket.get("Watchers", [])
        if not watchers:
            return

        docket_no = ticket.get("Docket_Number")
        subject_line = f"Watched Ticket Updated: #{docket_no} — {ticket.get('Subject', '')[:50]}"

        for watcher in watchers:
            watcher_email = watcher.get("email", "")
            if not watcher_email or not "@" in watcher_email:
                continue
            if exclude_email and watcher_email == exclude_email:
                continue

            html_body = f"""
            <html><body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background: #6366f1; color: #fff; padding: 16px 20px;">
                        <h3 style="margin: 0;">🔔 Watched Ticket Updated</h3>
                    </div>
                    <div style="padding: 20px;">
                        <p>Hello {watcher.get('name', 'there')},</p>
                        <p>A ticket you are watching has been updated.</p>
                        <table style="width:100%; border-collapse: collapse;">
                            <tr><td style="padding:8px 0; font-weight:bold; width:35%;">Docket #:</td><td style="padding:8px 0; color:#6366f1; font-weight:bold;">{docket_no}</td></tr>
                            <tr><td style="padding:8px 0; font-weight:bold;">Subject:</td><td style="padding:8px 0;">{ticket.get('Subject')}</td></tr>
                            <tr><td style="padding:8px 0; font-weight:bold;">New Status:</td><td style="padding:8px 0; font-weight:bold; color:#10b981;">{new_status}</td></tr>
                            <tr><td style="padding:8px 0; font-weight:bold;">Changed By:</td><td style="padding:8px 0;">{changed_by}</td></tr>
                        </table>
                        <div style="text-align:center; margin-top:20px;">
                            <a href="{settings.FRONTEND_BASE_URL}/ticket/{docket_no}" style="background:#6366f1; color:#fff; padding:10px 24px; text-decoration:none; border-radius:20px; font-weight:bold;">View Ticket</a>
                        </div>
                    </div>
                </div>
            </body></html>
            """
            background_tasks.add_task(
                self._send_exchange_mail,
                subject=subject_line,
                html_body=html_body,
                to_recipients=[watcher_email]
            )

    def send_assignment_notification(self, ticket: dict, assignee_name: str, assignee_email: str, assigned_by: str, background_tasks: BackgroundTasks):
        """Notify an employee that a ticket has been assigned to them"""
        docket_no = ticket.get("Docket_Number")
        subject = f"Ticket Assigned to You: #{docket_no} — {ticket.get('Subject', '')[:50]}"

        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; padding: 16px 20px;">
                    <h3 style="margin: 0;">📋 Ticket Assigned to You</h3>
                </div>
                <div style="padding: 20px;">
                    <p>Hello {assignee_name},</p>
                    <p><strong>{assigned_by}</strong> has assigned a service request ticket to you.</p>
                    <table style="width:100%; border-collapse: collapse;">
                        <tr><td style="padding:8px 0; font-weight:bold; width:35%;">Docket #:</td><td style="padding:8px 0; color:#f59e0b; font-weight:bold;">{docket_no}</td></tr>
                        <tr><td style="padding:8px 0; font-weight:bold;">Subject:</td><td style="padding:8px 0;">{ticket.get('Subject')}</td></tr>
                        <tr><td style="padding:8px 0; font-weight:bold;">Department:</td><td style="padding:8px 0;">{ticket.get('Department')}</td></tr>
                        <tr><td style="padding:8px 0; font-weight:bold;">Raised By:</td><td style="padding:8px 0;">{ticket.get('Data_Filled_by')}</td></tr>
                        <tr><td style="padding:8px 0; font-weight:bold; vertical-align:top;">Description:</td><td style="padding:8px 0; white-space:pre-wrap;">{ticket.get('Breif') or ticket.get('description', '')}</td></tr>
                    </table>
                    <div style="text-align:center; margin-top:20px;">
                        <a href="{settings.FRONTEND_BASE_URL}/ticket/{docket_no}" style="background:#f59e0b; color:#fff; padding:10px 24px; text-decoration:none; border-radius:20px; font-weight:bold;">View & Handle Ticket</a>
                    </div>
                </div>
            </div>
        </body></html>
        """
        background_tasks.add_task(
            self._send_exchange_mail,
            subject=subject,
            html_body=html_body,
            to_recipients=[assignee_email]
        )

    def generate_csat_token(self, docket_number: int) -> str:
        """Generate a signed JWT token for CSAT rating link (expires in 7 days)"""
        payload = {
            "docket": docket_number,
            "type": "csat",
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        return pyjwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

email_service = EmailService()
