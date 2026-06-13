from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.models.campaign import Campaign, Message, AuditLog
from typing import Dict, Any, List
import logging

router = APIRouter()
logger = logging.getLogger("backend.api.analytics")

@router.get("/overview")
def get_analytics_overview(db: Session = Depends(get_db)):
    """Fetches high-level metrics for the CRM dashboard"""
    try:
        # Total Shoppers
        total_shoppers = db.query(Customer).count()
        
        # Total Sales Revenue
        total_sales = db.query(func.sum(Order.amount)).scalar() or 0.0
        
        # Total Campaigns Run
        total_campaigns = db.query(Campaign).count()
        
        # Campaign Funnel Metrics
        total_msg = db.query(Message).count()
        delivered = db.query(Message).filter(Message.status == "delivered").count()
        opened = db.query(Message).filter(Message.status == "opened").count()
        read = db.query(Message).filter(Message.status == "read").count()
        clicked = db.query(Message).filter(Message.status == "clicked").count()
        converted = db.query(Message).filter(Message.status == "converted").count()
        
        # Calculate rates
        open_rate = (opened / delivered * 100) if delivered > 0 else 0.0
        click_rate = (clicked / opened * 100) if opened > 0 else 0.0
        conversion_rate = (converted / clicked * 100) if clicked > 0 else 0.0
        
        # Recent activity
        recent_campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).limit(5).all()
        recent_campaign_list = []
        for c in recent_campaigns:
            recent_campaign_list.append({
                "id": str(c.id),
                "name": c.name,
                "status": c.status,
                "created_at": c.created_at
            })
            
        return {
            "total_shoppers": total_shoppers,
            "total_revenue": float(total_sales),
            "campaigns_count": total_campaigns,
            "funnel": {
                "sent": total_msg,
                "delivered": delivered,
                "opened": opened,
                "read": read,
                "clicked": clicked,
                "converted": converted
            },
            "rates": {
                "open_rate": round(open_rate, 2),
                "click_rate": round(click_rate, 2),
                "conversion_rate": round(conversion_rate, 2)
            },
            "recent_campaigns": recent_campaign_list
        }
    except Exception as e:
        logger.error(f"Failed to load overview analytics: {e}")
        raise HTTPException(status_code=500, detail="Could not calculate analytics metrics.")

@router.get("/audit-logs", response_model=List[Dict[str, Any]])
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Returns system audit trail"""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [{
        "id": str(l.id),
        "action": l.action,
        "actor": l.actor,
        "details": l.details,
        "timestamp": l.timestamp
    } for l in logs]
