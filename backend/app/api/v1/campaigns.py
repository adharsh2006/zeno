from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, UUID4
from typing import List, Dict, Any, Optional
from uuid import uuid4
from app.core.database import get_db
from app.models.customer import Customer
from app.models.campaign import Segment, Campaign, Message, AuditLog
from app.services.segment_engine import segment_engine
from app.services.channel_client import channel_client
from app.services.agents_service import agents_service
from app.core.security import get_current_user, RoleChecker
import logging
import asyncio


router = APIRouter()
logger = logging.getLogger("backend.api.campaigns")

# Schemas
class SegmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rules: Dict[str, Any] = {}
    ai_explanation: Optional[str] = None

class CampaignCreate(BaseModel):
    name: str
    segment_id: UUID4
    channel: str # whatsapp, sms, email, rcs
    content: str
    prompt: Optional[str] = None

# Background worker task for dispatching campaign
async def execute_campaign_dispatch(campaign_id: str, channel: str, content: str, customer_ids: List[str]):
    # Note: We need a new database session per thread/task to avoid conflicts
    from app.core.database import SessionLocal
    db = SessionLocal()
    
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            logger.error(f"Background execution failed: Campaign {campaign_id} not found")
            return
            
        campaign.status = "sending"
        db.commit()
        
        logger.info(f"Starting background dispatch for campaign {campaign_id} to {len(customer_ids)} customers")
        
        for cid in customer_ids:
            customer = db.query(Customer).filter(Customer.id == cid).first()
            if not customer:
                continue
                
            recipient = customer.email if channel == "email" else customer.phone
            if not recipient:
                # Log dispatch error for customer without destination
                msg = Message(
                    campaign_id=campaign.id,
                    customer_id=customer.id,
                    channel=channel,
                    recipient="Unknown",
                    content=content,
                    status="failed",
                    error_message="Customer lacks email/phone for selected channel."
                )
                db.add(msg)
                db.commit()
                continue
            
            # Create message record
            msg = Message(
                id=uuid4(),
                campaign_id=campaign.id,
                customer_id=customer.id,
                channel=channel,
                recipient=recipient,
                content=content,
                status="pending"
            )
            db.add(msg)
            db.commit()
            
            # Async trigger the stub channel
            success = await channel_client.send_message(
                message_id=str(msg.id),
                campaign_id=str(campaign.id),
                recipient=recipient,
                message_text=content,
                channel=channel
            )
            
            if success:
                msg.status = "sent"
            else:
                msg.status = "failed"
                msg.error_message = "Failed to dispatch to Channel Service."
            db.commit()
            
        # Complete Campaign Status
        campaign.status = "completed"
        db.commit()
        
        audit = AuditLog(
            action="CAMPAIGN_DISPATCH_COMPLETE",
            actor="system",
            details={"campaign_id": campaign_id, "recipients_count": len(customer_ids)}
        )
        db.add(audit)
        db.commit()
        
    except Exception as e:
        logger.error(f"Error in campaign dispatch thread: {e}")
    finally:
        db.close()

# Routes
@router.post("/segments", status_code=status.HTTP_201_CREATED)
def create_segment(
    payload: SegmentCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(RoleChecker(["admin", "marketer"]))
):
    segment = Segment(
        name=payload.name,
        description=payload.description,
        rules=payload.rules,
        ai_explanation=payload.ai_explanation
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return segment

@router.get("/segments")
def list_segments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Segment).all()

@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(RoleChecker(["admin", "marketer"]))
):
    # Verify segment exists
    segment = db.query(Segment).filter(Segment.id == payload.segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
        
    campaign = Campaign(
        name=payload.name,
        segment_id=payload.segment_id,
        prompt=payload.prompt,
        status="draft"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Store campaign draft content details
    # We can fetch this when sending or pre-populate messages in draft.
    # We will pass content on dispatch.
    return {
        "campaign": {
            "id": str(campaign.id),
            "name": campaign.name,
            "segment_id": str(campaign.segment_id),
            "prompt": campaign.prompt,
            "status": campaign.status
        },
        "default_content": payload.content,
        "channel": payload.channel
    }

@router.get("/")
def list_campaigns(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    campaigns = db.query(Campaign).all()
    results = []
    for c in campaigns:
        # Calculate message counts by status
        total_msg = db.query(Message).filter(Message.campaign_id == c.id).count()
        delivered = db.query(Message).filter(Message.campaign_id == c.id, Message.status == "delivered").count()
        failed = db.query(Message).filter(Message.campaign_id == c.id, Message.status == "failed").count()
        opened = db.query(Message).filter(Message.campaign_id == c.id, Message.status == "opened").count()
        read = db.query(Message).filter(Message.campaign_id == c.id, Message.status == "read").count()
        clicked = db.query(Message).filter(Message.campaign_id == c.id, Message.status == "clicked").count()
        converted = db.query(Message).filter(Message.campaign_id == c.id, Message.status == "converted").count()
        
        results.append({
            "id": str(c.id),
            "name": c.name,
            "segment_name": c.segment.name if c.segment else "None",
            "status": c.status,
            "created_at": c.created_at,
            "metrics": {
                "total": total_msg,
                "delivered": delivered,
                "failed": failed,
                "opened": opened,
                "read": read,
                "clicked": clicked,
                "converted": converted
            }
        })
    return results

@router.post("/{id}/send")
def send_campaign(
    id: UUID4, 
    payload: Dict[str, Any], 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db),
    current_user = Depends(RoleChecker(["admin", "marketer"]))
):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    if campaign.status == "sending" or campaign.status == "completed":
        raise HTTPException(status_code=400, detail="Campaign already sent or currently sending")
        
    segment = campaign.segment
    if not segment:
        raise HTTPException(status_code=400, detail="Campaign must be associated with a valid segment")
        
    channel = payload.get("channel", "email")
    content = payload.get("content", "Hello from Xeno!")
    
    # Extract target shoppers using segment engine
    shoppers = segment_engine.get_cohort_customers(db, segment.rules)
    if not shoppers:
        raise HTTPException(status_code=400, detail="Segment contains 0 target shoppers. Ingest shoppers or adjust segment rules.")
        
    customer_ids = [str(s.id) for s in shoppers]
    
    # Run the background task
    background_tasks.add_task(
        execute_campaign_dispatch, 
        str(campaign.id), 
        channel, 
        content, 
        customer_ids
    )
    
    # Log campaign trigger
    audit = AuditLog(
        action="CAMPAIGN_TRIGGERED",
        actor="user",
        details={"campaign_id": str(campaign.id), "targets": len(customer_ids)}
    )
    db.add(audit)
    db.commit()
    
    return {"status": "dispatched", "targets_count": len(customer_ids)}

class RecommendRequest(BaseModel):
    prompt: str

@router.post("/recommend")
def recommend_campaign(
    payload: RecommendRequest,
    current_user = Depends(RoleChecker(["admin", "marketer"]))
):
    """Runs the LangGraph orchestration to generate audience, channel, and content recommendations"""
    try:
        recommendations = agents_service.generate_recommendations(payload.prompt)
        return recommendations
    except Exception as e:
        logger.error(f"Recommendation generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to run AI recommendation engine.")
