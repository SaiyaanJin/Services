import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

def create_app() -> FastAPI:
    """FastAPI Application Factory"""
    app = FastAPI(
        title="ERLDC Service Request Portal Backend",
        description="Enterprise Service Request & Ticketing API",
        version="2.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None
    )

    # Configure CORS middleware with regex for intranet requests and allow_credentials=True
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.routes.tickets import router as tickets_router
    from app.routes.dashboard import router as dashboard_router
    from app.routes.files import router as files_router
    from app.routes.admin import router as admin_router

    app.include_router(tickets_router, tags=["Tickets"])
    app.include_router(dashboard_router, tags=["Dashboard"])
    app.include_router(files_router, tags=["Files"])
    app.include_router(admin_router, tags=["Admin"])

    @app.get("/health", tags=["Health"])
    def health_check():
        """Backend health check endpoint"""
        from app.db import db
        mongo_status = "healthy"
        try:
            db.client.admin.command('ping')
        except Exception:
            mongo_status = "unhealthy"

        return {
            "status": "healthy",
            "database": mongo_status,
            "sso_verify_url": f"{settings.SSO_BASE_URL}/verify"
        }

    logger.info("FastAPI application successfully created and configured")
    return app
