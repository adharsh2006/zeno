from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.campaign import Message, AuditLog, Campaign
import logging

router = APIRouter()
logger = logging.getLogger("backend.api.webhooks")

class ChannelReceiptSchema(BaseModel):
    message_id: str
    campaign_id: str
    recipient: str
    channel: Optional[str] = None
    status: str # delivered, failed, opened, read, clicked, converted
    error_message: Optional[str] = None

@router.post("/channel-receipt", status_code=status.HTTP_200_OK)
def channel_receipt(payload: ChannelReceiptSchema, db: Session = Depends(get_db)):
    """Receives event updates from the stubbed channel service and tracks metrics"""
    logger.info(f"Received webhook callback for message {payload.message_id} -> {payload.status}")
    
    # 1. Find the message record
    message = db.query(Message).filter(Message.id == payload.message_id).first()
    if not message:
        logger.warning(f"Webhook callback received for unknown message_id: {payload.message_id}")
        # Return 200 to prevent webhook sender retries, but log warning
        return {"status": "ignored", "reason": "unknown_message_id"}
        
    # 2. Update status and timestamps
    # Only progress status forward. e.g. don't overwrite "read" with "delivered" if events arrive out of order
    status_priority = {
        "pending": 0,
        "failed": 1,
        "sent": 2,
        "delivered": 3,
        "opened": 4,
        "read": 5,
        "clicked": 6,
        "converted": 7
    }
    
    current_status = message.status or "pending"
    new_status = payload.status
    
    # Check status transition priority
    if status_priority.get(new_status, 0) >= status_priority.get(current_status, 0) or new_status == "failed":
        message.status = new_status
        if payload.error_message:
            message.error_message = payload.error_message
            
    # 3. Log to audit trails
    audit = AuditLog(
        action="MESSAGE_STATUS_UPDATE",
        actor="stub_channel_service",
        details={
            "message_id": str(message.id),
            "campaign_id": str(message.campaign_id),
            "old_status": current_status,
            "new_status": new_status
        }
    )
    db.add(audit)
    
    # Check if all messages in the campaign have completed processing (for campaign state update)
    db.commit()
    
    return {"status": "success", "message_id": str(message.id), "new_status": message.status}
