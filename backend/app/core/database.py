from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Automatically create tables for quick local development/Docker setup
    from app.models.customer import Customer
    from app.models.order import Order
    from app.models.campaign import Segment, Campaign, Message, AuditLog
    Base.metadata.create_all(bind=engine)
