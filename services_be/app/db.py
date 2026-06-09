from pymongo import MongoClient, errors
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.client = None
        self.db = None
        self.tickets_collection = None
        self.counters_collection = None
        self.connect()

    def connect(self):
        try:
            # Configure connection pooling using maxPoolSize
            self.client = MongoClient(settings.MONGO_URI, maxPoolSize=50, minPoolSize=10)
            self.db = self.client[settings.MONGO_DB]
            self.tickets_collection = self.db[settings.MONGO_COLLECTION]
            self.counters_collection = self.db["counters"]
            self.initialize_indexes()
            logger.info("Successfully connected to MongoDB")
        except errors.ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise e

    def initialize_indexes(self):
        """Create indexes needed for queries and dashboard metrics"""
        try:
            # 1. Index on Docket_Number (descending) for fast sorting and unique constraint
            self.tickets_collection.create_index([("Docket_Number", -1)], unique=True)

            # 2. Indexes for user access and ownership queries
            self.tickets_collection.create_index([("Data_Filled_by", 1)])
            self.tickets_collection.create_index([("User_Department", 1)])

            # 3. Indexes for department-level queues
            self.tickets_collection.create_index([("Department", 1), ("Present_Status", 1)])

            # 4. Indexes for SLA and creation date queries
            self.tickets_collection.create_index([("Input_Date", -1)])
            self.tickets_collection.create_index([("Present_Status", 1), ("Input_Date", -1)])

            # 5. Initialize docket counter if it does not exist
            if self.counters_collection.find_one({"_id": "docket_number"}) is None:
                # Find maximum docket number currently in User_Input
                max_docket = 1000  # Default starting docket number
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
            # Fallback (non-atomic, last resort)
            last_ticket = self.tickets_collection.find_one(sort=[("Docket_Number", -1)])
            if last_ticket and "Docket_Number" in last_ticket:
                return int(last_ticket["Docket_Number"]) + 1
            return 1001

db = Database()
