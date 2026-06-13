from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import customers, campaigns, webhooks, analytics
import logging

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup DB initialisation
@app.on_event("startup")
def startup_event():
    logger.info("Initializing database and creating tables if not exist...")
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

# Main entry/healthcheck
@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "docs": "/api/docs"
    }

# API routers
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(campaigns.router, prefix="/api/v1/campaigns", tags=["campaigns"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["webhooks"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
