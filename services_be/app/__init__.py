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
        version="3.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Import and register all routers
    from app.routes.tickets import router as tickets_router
    from app.routes.dashboard import router as dashboard_router
    from app.routes.files import router as files_router
    from app.routes.admin import router as admin_router
    from app.routes.notifications import router as notifications_router
    from app.routes.sla import router as sla_router
    from app.routes.admin_panel import router as admin_panel_router
    from app.routes.knowledge_base import router as kb_router

    app.include_router(tickets_router, tags=["Tickets"])
    app.include_router(dashboard_router, tags=["Dashboard"])
    app.include_router(files_router, tags=["Files"])
    app.include_router(admin_router, tags=["Admin (Legacy)"])
    app.include_router(notifications_router, tags=["Notifications"])
    app.include_router(sla_router, tags=["SLA"])
    app.include_router(admin_panel_router, tags=["Admin Panel"])
    app.include_router(kb_router, tags=["Knowledge Base"])

    @app.on_event("startup")
    async def on_startup():
        import asyncio
        from app import utils
        utils.MAIN_EVENT_LOOP = asyncio.get_running_loop()

        from app.services.reminder_service import start_reminder_scheduler
        from app.services.recurring_service import start_recurring_scheduler
        await start_reminder_scheduler()
        await start_recurring_scheduler()

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
            "version": "3.0.0",
            "database": mongo_status,
            "sso_verify_url": f"{settings.SSO_BASE_URL}/verify"
        }

    logger.info("FastAPI application v3.0.0 successfully created and configured")
    return app
