from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.core.database import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.models.campaign import AuditLog
from app.core.security import get_current_user, RoleChecker
import logging
import json

router = APIRouter()
logger = logging.getLogger("backend.api.customers")

class OrderIngestSchema(BaseModel):
    amount: float
    items: List[Dict[str, Any]] = []
    status: str = "completed"
    order_date: Optional[datetime] = None

class CustomerIngestSchema(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    metadata: Dict[str, Any] = {}
    orders: List[OrderIngestSchema] = []

class IngestRequest(BaseModel):
    customers: List[CustomerIngestSchema]

@router.post("/ingest", status_code=status.HTTP_201_CREATED)
def ingest_data(
    payload: IngestRequest, 
    db: Session = Depends(get_db),
    current_user = Depends(RoleChecker(["admin"]))
):

    """Bulk ingestion of shoppers and their purchase history"""
    customers_added = 0
    orders_added = 0
    
    try:
        for cust_data in payload.customers:
            if not cust_data.email and not cust_data.phone:
                continue # Must have email or phone to identify
                
            # Check for existing customer by email or phone
            customer = None
            if cust_data.email:
                customer = db.query(Customer).filter(Customer.email == cust_data.email).first()
            if not customer and cust_data.phone:
                customer = db.query(Customer).filter(Customer.phone == cust_data.phone).first()
                
            if not customer:
                customer = Customer(
                    email=cust_data.email,
                    phone=cust_data.phone,
                    first_name=cust_data.first_name,
                    last_name=cust_data.last_name,
                    metadata_fields=cust_data.metadata
                )
                db.add(customer)
                db.flush() # Populate ID
                customers_added += 1
            else:
                # Update attributes
                if cust_data.first_name: customer.first_name = cust_data.first_name
                if cust_data.last_name: customer.last_name = cust_data.last_name
                if cust_data.metadata:
                    merged_meta = dict(customer.metadata_fields or {})
                    merged_meta.update(cust_data.metadata)
                    customer.metadata_fields = merged_meta
            
            # Ingest orders
            for ord_data in cust_data.orders:
                order = Order(
                    customer_id=customer.id,
                    amount=ord_data.amount,
                    items=ord_data.items,
                    status=ord_data.status,
                    order_date=ord_data.order_date or datetime.utcnow()
                )
                db.add(order)
                orders_added += 1
                
        db.commit()
        
        # Log event
        audit = AuditLog(
            action="INGEST_SHOULDERS",
            actor="system",
            details={"customers_ingested": customers_added, "orders_ingested": orders_added}
        )
        db.add(audit)
        db.commit()
        
        return {
            "status": "success",
            "message": f"Successfully ingested {customers_added} new customers and {orders_added} orders."
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest data: {str(e)}"
        )

@router.get("/")
def get_customers(
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Fetch customer list with order summaries"""
    customers = db.query(Customer).offset(skip).limit(limit).all()
    results = []
    for c in customers:
        orders = db.query(Order).filter(Order.customer_id == c.id).all()
        total_spend = sum(o.amount for o in orders)
        results.append({
            "id": str(c.id),
            "email": c.email,
            "phone": c.phone,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "metadata": c.metadata_fields,
            "order_count": len(orders),
            "total_spend": float(total_spend),
            "created_at": c.created_at
        })
    return results

@router.get("/{customer_id}")
def get_customer_details(
    customer_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Fetch complete customer detail profile with order history and message touchpoints"""
    import uuid
    try:
        cust_uuid = uuid.UUID(customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")

    customer = db.query(Customer).filter(Customer.id == cust_uuid).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    orders = db.query(Order).filter(Order.customer_id == cust_uuid).order_by(Order.order_date.desc()).all()
    
    # Query messages joined with campaigns
    from app.models.campaign import Message, Campaign
    messages_query = db.query(Message, Campaign.name.label("campaign_name")).outerjoin(
        Campaign, Message.campaign_id == Campaign.id
    ).filter(Message.customer_id == cust_uuid).order_by(Message.created_at.desc()).all()

    touchpoints = []
    for msg, camp_name in messages_query:
        touchpoints.append({
            "id": str(msg.id),
            "campaign_id": str(msg.campaign_id),
            "campaign_name": camp_name or "Unknown Campaign",
            "channel": msg.channel,
            "recipient": msg.recipient,
            "content": msg.content,
            "status": msg.status,
            "error_message": msg.error_message,
            "created_at": msg.created_at
        })

    orders_list = []
    for o in orders:
        orders_list.append({
            "id": str(o.id),
            "amount": float(o.amount),
            "items": o.items,
            "status": o.status,
            "order_date": o.order_date
        })

    return {
        "id": str(customer.id),
        "email": customer.email,
        "phone": customer.phone,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "metadata": customer.metadata_fields,
        "created_at": customer.created_at,
        "orders": orders_list,
        "touchpoints": touchpoints
    }

