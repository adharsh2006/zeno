from sqlalchemy import create_engine, text
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
    from app.models.user import User
    Base.metadata.create_all(bind=engine)

    # Safe SQL Alter statements to ensure columns exist on Campaign table (handles existing volumes)
    with engine.connect() as conn:
        try:
            # PostgreSQL uses transactional DDL; we need to commit explicitly
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_journey BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS fallback_channel VARCHAR;"))
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS fallback_content TEXT;"))
            conn.commit()
        except Exception as e:
            import logging
            logging.getLogger("backend.database").warning(f"Alter campaigns table column checks skipped/failed: {e}")

