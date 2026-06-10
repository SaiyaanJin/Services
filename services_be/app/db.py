from pymongo import MongoClient, errors, TEXT
import logging
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.client = None
        self.db = None
        self.tickets_collection = None
        self.counters_collection = None
        self.audit_logs_collection = None
        self.notifications_collection = None
        self.sla_policies_collection = None
        self.tag_config_collection = None
        self.ticket_templates_collection = None
        self.knowledge_base_collection = None
        self.recurring_tickets_collection = None
        self.admin_roles_collection = None
        self.connect()

    def connect(self):
        try:
            self.client = MongoClient(settings.MONGO_URI, maxPoolSize=50, minPoolSize=10)
            self.db = self.client[settings.MONGO_DB]
            self.tickets_collection = self.db[settings.MONGO_COLLECTION]
            self.counters_collection = self.db["counters"]
            self.audit_logs_collection = self.db["audit_logs"]
            self.notifications_collection = self.db["notifications"]
            self.sla_policies_collection = self.db["sla_policies"]
            self.tag_config_collection = self.db["tag_config"]
            self.ticket_templates_collection = self.db["ticket_templates"]
            self.knowledge_base_collection = self.db["knowledge_base"]
            self.recurring_tickets_collection = self.db["recurring_tickets"]
            self.admin_roles_collection = self.db["admin_roles"]
            self.initialize_indexes()
            self.seed_default_data()
            logger.info("Successfully connected to MongoDB")
        except errors.ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise e

    def initialize_indexes(self):
        """Create indexes needed for queries, dashboard metrics, and text search"""
        try:
            # Ticket indexes
            self.tickets_collection.create_index([("Docket_Number", -1)], unique=True)
            self.tickets_collection.create_index([("Data_Filled_by", 1)])
            self.tickets_collection.create_index([("User_Department", 1)])
            self.tickets_collection.create_index([("Department", 1), ("Present_Status", 1)])
            self.tickets_collection.create_index([("Input_Date", -1)])
            self.tickets_collection.create_index([("Present_Status", 1), ("Input_Date", -1)])
            self.tickets_collection.create_index([("Priority", 1)])
            self.tickets_collection.create_index([("Tags", 1)])
            self.tickets_collection.create_index([("Watchers.emp_id", 1)])
            self.tickets_collection.create_index([("Assigned_To.emp_id", 1)])
            self.tickets_collection.create_index([("SLA_Deadline", 1)])
            # Full-text search index on Subject + Breif fields
            try:
                self.tickets_collection.create_index(
                    [("Subject", TEXT), ("Breif", TEXT)],
                    name="text_search_index",
                    default_language="english"
                )
            except Exception:
                pass  # Index may already exist

            # Audit log indexes
            self.audit_logs_collection.create_index([("docket_number", 1), ("timestamp", -1)])
            self.audit_logs_collection.create_index([("user_emp_id", 1)])

            # Notifications indexes
            self.notifications_collection.create_index([("recipient_emp_id", 1), ("read", 1), ("created_at", -1)])

            # Initialize docket counter
            if self.counters_collection.find_one({"_id": "docket_number"}) is None:
                max_docket = 1000
                last_ticket = self.tickets_collection.find_one(sort=[("Docket_Number", -1)])
                if last_ticket and "Docket_Number" in last_ticket:
                    try:
                        max_docket = int(last_ticket["Docket_Number"])
                    except (ValueError, TypeError):
                        pass
                self.counters_collection.insert_one({
                    "_id": "docket_number",
                    "sequence_value": max_docket
                })
                logger.info(f"Initialized docket counter sequence to: {max_docket}")
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")

    def seed_default_data(self):
        """Seed default SLA policies and initial tag config if not present"""
        try:
            # Seed SLA policies (48 business hours default for all departments)
            if self.sla_policies_collection.count_documents({}) == 0:
                default_policies = [
                    {"department": "Human Resource : Human Resource", "sla_hours": 72},
                    {"department": "Contract Services : Contract Services", "sla_hours": 96},
                    {"department": "Finance : Finance & Accounts", "sla_hours": 72},
                    {"department": "Cyber Security : Cyber Security", "sla_hours": 24},
                    {"department": "System Operation : Post Despatch", "sla_hours": 48},
                    {"department": "System Operation : Real Time Operation", "sla_hours": 48},
                    {"department": "System Operation : Operational Planning", "sla_hours": 48},
                    {"department": "Market Operation : Open Access", "sla_hours": 48},
                    {"department": "Market Operation : Market Coordination", "sla_hours": 48},
                    {"department": "Market Operation : Interface Energy Metering, Accounting & Settlement", "sla_hours": 48},
                    {"department": "Market Operation : Regulatory Affairs, Market Operation planning & Coordination", "sla_hours": 48},
                    {"department": "Logistics : TS", "sla_hours": 72},
                    {"department": "Logistics : IT", "sla_hours": 48},
                    {"department": "Logistics : Communication", "sla_hours": 48},
                    {"department": "Logistics : OT (Decision Support)", "sla_hours": 48},
                ]
                self.sla_policies_collection.insert_many(default_policies)
                logger.info("Seeded default SLA policies")

            # Seed default tags if not present
            if self.tag_config_collection.count_documents({}) == 0:
                default_tags = [
                    {"name": "urgent", "color": "#ef4444", "created_at": datetime.now()},
                    {"name": "vpn", "color": "#8b5cf6", "created_at": datetime.now()},
                    {"name": "hardware", "color": "#f59e0b", "created_at": datetime.now()},
                    {"name": "software", "color": "#3b82f6", "created_at": datetime.now()},
                    {"name": "network", "color": "#10b981", "created_at": datetime.now()},
                    {"name": "access", "color": "#6366f1", "created_at": datetime.now()},
                    {"name": "data-request", "color": "#ec4899", "created_at": datetime.now()},
                    {"name": "waiting-vendor", "color": "#64748b", "created_at": datetime.now()},
                ]
                self.tag_config_collection.insert_many(default_tags)
                logger.info("Seeded default tags")
        except Exception as e:
            logger.error(f"Error seeding default data: {e}")

    def get_next_docket_number(self) -> int:
        """Atomic docket number generator using counters collection"""
        try:
            counter = self.counters_collection.find_one_and_update(
                {"_id": "docket_number"},
                {"$inc": {"sequence_value": 1}},
                return_document=True
            )
            return counter["sequence_value"]
        except Exception as e:
            logger.error(f"Failed to generate atomic docket number: {e}")
            last_ticket = self.tickets_collection.find_one(sort=[("Docket_Number", -1)])
            if last_ticket and "Docket_Number" in last_ticket:
                return int(last_ticket["Docket_Number"]) + 1
            return 1001

    def write_audit_log(self, docket_number: int, user_emp_id: str, user_name: str, action: str, field: str = None, old_value=None, new_value=None):
        """Append-only audit log entry"""
        try:
            self.audit_logs_collection.insert_one({
                "docket_number": docket_number,
                "user_emp_id": user_emp_id,
                "user_name": user_name,
                "action": action,
                "field": field,
                "old_value": str(old_value) if old_value is not None else None,
                "new_value": str(new_value) if new_value is not None else None,
                "timestamp": datetime.now()
            })
        except Exception as e:
            logger.error(f"Failed to write audit log for docket {docket_number}: {e}")

    def create_notification(self, recipient_emp_id: str, recipient_name: str, docket_number: int, notif_type: str, message: str):
        """Create a persistent notification for a user"""
        try:
            self.notifications_collection.insert_one({
                "recipient_emp_id": recipient_emp_id,
                "recipient_name": recipient_name,
                "docket_number": docket_number,
                "type": notif_type,
                "message": message,
                "read": False,
                "created_at": datetime.now()
            })
        except Exception as e:
            logger.error(f"Failed to create notification for {recipient_emp_id}: {e}")

    def get_sla_deadline(self, department: str, created_at: datetime) -> datetime:
        """Compute SLA deadline based on department policy and creation time"""
        try:
            policy = self.sla_policies_collection.find_one({"department": department})
            sla_hours = policy["sla_hours"] if policy else 48
            from datetime import timedelta
            return created_at + timedelta(hours=sla_hours)
        except Exception:
            from datetime import timedelta
            return created_at + timedelta(hours=48)

db = Database()
