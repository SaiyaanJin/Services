import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

class Settings:
    PORT: int = int(os.getenv("PORT", 5050))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

    # MongoDB Settings
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "Complaints")
    MONGO_COLLECTION: str = os.getenv("MONGO_COLLECTION", "User_Input")

    # Mail Settings
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "mail.grid-india.in")
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_SMTP_ADDRESS: str = os.getenv("MAIL_SMTP_ADDRESS", "")

    # SSO Settings
    SSO_BASE_URL: str = os.getenv("SSO_BASE_URL", "https://sso.erldc.in:5000")
    SSO_API_KEY: str = os.getenv("SSO_API_KEY", "")
    SSO_JWT_SECRET: str = os.getenv("SSO_JWT_SECRET", "it@posoco")

    # Frontend URL (for generating deep-links in email notifications)
    FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "http://10.3.230.62:3001")

    # File Settings
    UPLOAD_BASE_PATH: str = os.getenv("UPLOAD_BASE_PATH", "E:/Applications/Services/services_be/instance/htmlfi/")
    ZIP_TEMP_PATH: str = os.getenv("ZIP_TEMP_PATH", "E:/Applications/Services/services_be/instance/ZipFiles/")

    # Security Settings
    ALLOWED_CORS_ORIGIN: str = os.getenv("ALLOWED_CORS_ORIGIN", "http://localhost:3001")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "erldc-services-super-secret-key-2026")

settings = Settings()
