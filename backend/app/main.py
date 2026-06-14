from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import auth, customers, campaigns, webhooks, analytics
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

def seed_default_users():
    from app.core.database import SessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash
    
    db = SessionLocal()
    try:
        # Check and seed admin
        admin_email = "admin@xeno.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin_user = User(
                username="admin",
                email=admin_email,
                hashed_password=get_password_hash("password123"),
                role="admin"
            )
            db.add(admin_user)
            logger.info("Seeded default admin account (admin@xeno.com / password123)")

        # Check and seed marketer
        marketer_email = "marketer@xeno.com"
        marketer = db.query(User).filter(User.email == marketer_email).first()
        if not marketer:
            marketer_user = User(
                username="marketer",
                email=marketer_email,
                hashed_password=get_password_hash("password123"),
                role="marketer"
            )
            db.add(marketer_user)
            logger.info("Seeded default marketer account (marketer@xeno.com / password123)")

        # Check and seed viewer
        viewer_email = "viewer@xeno.com"
        viewer = db.query(User).filter(User.email == viewer_email).first()
        if not viewer:
            viewer_user = User(
                username="viewer",
                email=viewer_email,
                hashed_password=get_password_hash("password123"),
                role="viewer"
            )
            db.add(viewer_user)
            logger.info("Seeded default viewer account (viewer@xeno.com / password123)")

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed default users: {e}")
    finally:
        db.close()

def seed_default_segments():
    from app.core.database import SessionLocal
    from app.models.campaign import Segment
    
    db = SessionLocal()
    try:
        existing_seg = db.query(Segment).filter(Segment.name == "At-Risk VIP Shoppers").first()
        if not existing_seg:
            at_risk_seg = Segment(
                name="At-Risk VIP Shoppers",
                description="Customers with 2+ past orders but inactive for over 60 days.",
                rules={"min_orders": 2, "days_inactive": 60},
                ai_explanation="Auto-surfaced high-value cohorts at high risk of churn."
            )
            db.add(at_risk_seg)
            db.commit()
            logger.info("Seeded default segment 'At-Risk VIP Shoppers'")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed default segments: {e}")
    finally:
        db.close()

# Startup DB initialisation
@app.on_event("startup")
def startup_event():
    logger.info("Initializing database and creating tables if not exist...")
    try:
        init_db()
        logger.info("Database initialized successfully.")
        seed_default_users()
        seed_default_segments()
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
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(campaigns.router, prefix="/api/v1/campaigns", tags=["campaigns"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["webhooks"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])

