import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class Segment(Base):
    __tablename__ = "segments"

    id = Column(UUID(as_uuid=True), primary key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    rules = Column(JSONB, default=dict) # E.g., {"min_spend": 100, "days_inactive": 30}
    sql_query = Column(Text, nullable=True) # Direct SQL compiled for cohort extraction
    ai_explanation = Column(Text, nullable=True) # Why this segment was recommended
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    campaigns = relationship("Campaign", back_populates="segment")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    segment_id = Column(UUID(as_uuid=True), ForeignKey("segments.id", ondelete="SET NULL"), nullable=True)
    prompt = Column(Text, nullable=True) # AI instruction used to formulate campaign
    status = Column(String, default="draft") # draft, sending, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    segment = relationship("Segment", back_populates="campaigns")
    messages = relationship("Message", back_populates="campaign", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    channel = Column(String, nullable=False) # whatsapp, sms, email, rcs
    recipient = Column(String, nullable=False) # phone or email
    content = Column(Text, nullable=False)
    status = Column(String, default="pending") # pending, sent, delivered, failed, opened, read, clicked, converted
    error_message = Column(Text, nullable=True)
    external_id = Column(UUID(as_uuid=True), nullable=True) # ID returned by the stub channel service
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    campaign = relationship("Campaign", back_populates="messages")
    customer = relationship("Customer", back_populates="messages")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary key=True, default=uuid.uuid4)
    action = Column(String, nullable=False) # E.g., INGEST, CAMPAIGN_START, WEBHOOK_CALLBACK
    actor = Column(String, default="system") # system, user, ai_agent
    details = Column(JSONB, default=dict)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
