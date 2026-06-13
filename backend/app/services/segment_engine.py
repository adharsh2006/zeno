from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.customer import Customer
from app.models.order import Order
from typing import List, Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger("backend.segment_engine")

class SegmentEngine:
    @staticmethod
    def get_cohort_customers(db: Session, rules: Dict[str, Any]) -> List[Customer]:
        """Filters customers based on rules dictionary"""
        query = db.query(Customer)
        
        # 1. Total Spend filter
        min_spend = rules.get("min_spend")
        if min_spend is not None:
            # Subquery to aggregate total spend per customer
            subquery = db.query(
                Order.customer_id, 
                func.sum(Order.amount).label("total_spend")
            ).group_by(Order.customer_id).subquery()
            
            query = query.join(subquery, Customer.id == subquery.c.customer_id).filter(
                subquery.c.total_spend >= min_spend
            )
            
        # 2. Minimum Order Count filter
        min_orders = rules.get("min_orders")
        if min_orders is not None:
            subquery = db.query(
                Order.customer_id,
                func.count(Order.id).label("order_count")
            ).group_by(Order.customer_id).subquery()
            
            query = query.join(subquery, Customer.id == subquery.c.customer_id).filter(
                subquery.c.order_count >= min_orders
            )
            
        # 3. Inactivity window (days since last order)
        days_inactive = rules.get("days_inactive")
        if days_inactive is not None:
            cutoff_date = datetime.utcnow() - timedelta(days=days_inactive)
            
            # Find customers whose MAX order_date is older than cutoff_date
            subquery = db.query(
                Order.customer_id,
                func.max(Order.order_date).label("last_order_date")
            ).group_by(Order.customer_id).subquery()
            
            query = query.join(subquery, Customer.id == subquery.c.customer_id).filter(
                subquery.c.last_order_date <= cutoff_date
            )
            
        # 4. Filter by customer metadata preference tags (e.g. category)
        preferred_category = rules.get("preferred_category")
        if preferred_category:
            # Query JSONB column 'metadata' key 'preferred_category'
            query = query.filter(Customer.metadata_fields["preferred_category"].astext == preferred_category)
            
        # 5. Filter by location/city
        city = rules.get("city")
        if city:
            query = query.filter(Customer.metadata_fields["city"].astext.ilike(f"%{city}%"))

        # Fallback to returning all if rules are empty
        return query.all()

    @staticmethod
    def get_available_rules_summary(db: Session) -> Dict[str, Any]:
        """Returns metadata statistics to feed intelligence recommendations"""
        total_customers = db.query(Customer).count()
        total_orders = db.query(Order).count()
        avg_order_value = db.query(func.avg(Order.amount)).scalar() or 0.0
        
        return {
            "total_shoppers": total_customers,
            "total_orders": total_orders,
            "average_order_value": float(avg_order_value)
        }
segment_engine = SegmentEngine()
