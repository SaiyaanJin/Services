import logging
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
        "cc": ]
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

    def send_new_ticket_email(self, ticket: dict, background_tasks: BackgroundTasks):
        """Asynchronously send email notification to target department about a new ticket"""
        dept_name = ticket.get("Department")
        docket_no = ticket.get("Docket_Number")
        subject = f"New Service Request: {ticket.get('Subject')} (Docket No- {docket_no})"
        
        email_info = DEPARTMENT_EMAIL_MAPPING.get(dept_name)
        if not email_info:
            logger.warning(f"No email configuration found for department: {dept_name}. Skipping email.")
            return

        to_recipients = email_info["to"]
        cc_recipients = email_info["cc"]

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
                            <a href="https://sso.erldc.in/" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">View Ticket in Portal</a>
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

    def send_status_update_email(self, ticket: dict, status_choice: str, edited_by: str, issuer_email: str, background_tasks: BackgroundTasks):
        """Asynchronously notify the ticket creator about changes to the ticket status"""
        if not issuer_email:
            logger.warning(f"No issuer email provided for ticket {ticket.get('Docket_Number')}. Skipping notification email.")
            return

        docket_no = ticket.get("Docket_Number")
        subject = f"Service Request Updated: {ticket.get('Subject')} (Docket No- {docket_no}) is marked {status_choice}"

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
                        
                        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                            <p style="margin: 0; font-weight: bold; font-size: 14px;">Next Steps:</p>
                            <p style="margin: 4px 0 0 0; font-size: 13px;">Please log in to the portal to Accept/Deny the service request status. If accepted, the ticket will close.</p>
                        </div>
                        
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="https://sso.erldc.in/" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">Log in to Service Request Portal</a>
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
            to_recipients=[issuer_email]
        )

email_service = EmailService()
