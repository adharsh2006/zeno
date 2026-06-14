from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.campaign import Message, AuditLog, Campaign
import logging
import asyncio

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
def channel_receipt(
    payload: ChannelReceiptSchema, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
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
    
    # Check if we should reengage clicked but not converted shoppers after 24h (simulated 6s)
    if new_status == "clicked":
        from app.core.database import SessionLocal
        background_tasks.add_task(
            check_and_reengage_click_no_convert,
            str(message.id),
            SessionLocal
        )

    # Check if all messages in the campaign have completed processing (for campaign state update)
    db.commit()
    
    return {"status": "success", "message_id": str(message.id), "new_status": message.status}

async def check_and_reengage_click_no_convert(message_id: str, db_session_factory):
    # Wait for 6 seconds (simulating 24 hours conversion window)
    await asyncio.sleep(6.0)
    
    db = db_session_factory()
    try:
        from app.models.campaign import Message, Campaign
        from app.models.customer import Customer
        from app.services.channel_client import channel_client
        import uuid
        
        # Reload message
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message or message.status != "clicked":
            # Either not found or converted or went backward/forward
            return
            
        logger.info(f"Auto-Re-engagement: Click-no-convert detected for message {message_id} (Customer {message.customer_id})")
        
        # 1. Update customer metadata
        customer = db.query(Customer).filter(Customer.id == message.customer_id).first()
        if customer:
            meta = dict(customer.metadata_fields or {})
            meta["click_no_convert"] = True
            customer.metadata_fields = meta
            db.add(customer)
            db.commit()
            
        # 2. Re-engage on a different channel
        # Fallback channel logic: email -> whatsapp, whatsapp -> sms, rcs -> whatsapp, sms -> email
        alt_channels = {
            "email": "whatsapp",
            "whatsapp": "sms",
            "rcs": "whatsapp",
            "sms": "email"
        }
        alt_channel = alt_channels.get(message.channel, "sms")
        recipient = customer.email if alt_channel == "email" else customer.phone
        if not recipient:
            # Fallback to whatever matches
            alt_channel = "whatsapp" if customer.phone else "email"
            recipient = customer.phone if alt_channel == "whatsapp" else customer.email
            
        if not recipient:
            logger.warning("Auto-Re-engagement failed: customer has no phone or email destination.")
            return
            
        # Check if the "Auto-Re-engagement: Click-No-Convert" campaign exists, else create it
        reengage_camp = db.query(Campaign).filter(Campaign.name == "Auto-Re-engagement: Click-No-Convert").first()
        if not reengage_camp:
            # Create a mock segment first
            from app.models.campaign import Segment
            reengage_seg = db.query(Segment).filter(Segment.name == "Click-No-Convert cohort").first()
            if not reengage_seg:
                reengage_seg = Segment(
                    name="Click-No-Convert cohort",
                    description="Automatically enrolled customers who clicked but didn't buy.",
                    rules={"click_no_convert": True},
                    ai_explanation="Dynamic automation funnel for high intent drop-offs."
                )
                db.add(reengage_seg)
                db.flush()
                
            reengage_camp = Campaign(
                name="Auto-Re-engagement: Click-No-Convert",
                segment_id=reengage_seg.id,
                prompt="Follow up with shoppers who clicked a link but didn't buy within 24 hours.",
                status="sending"
            )
            db.add(reengage_camp)
            db.flush()
            
        # Create the re-engagement message content
        reengage_content = f"Hey {customer.first_name or 'there'}! We noticed you checked out our offers but didn't complete your order. Here is an extra 5% off code just for you: FINISH5. Valid today! Shop: https://xeno.com/finish"
        
        followup_msg = Message(
            id=uuid.uuid4(),
            campaign_id=reengage_camp.id,
            customer_id=customer.id,
            channel=alt_channel,
            recipient=recipient,
            content=reengage_content,
            status="pending"
        )
        db.add(followup_msg)
        db.commit()
        
        # Trigger stub channel send
        await channel_client.send_message(
            message_id=str(followup_msg.id),
            campaign_id=str(reengage_camp.id),
            recipient=recipient,
            message_text=reengage_content,
            channel=alt_channel
        )
        
        followup_msg.status = "sent"
        db.commit()
        logger.info(f"Auto-Re-engagement follow-up message sent successfully: {followup_msg.id}")
    except Exception as e:
        logger.error(f"Error in click-no-convert auto-re-engagement: {e}")
        db.rollback()
    finally:
        db.close()
