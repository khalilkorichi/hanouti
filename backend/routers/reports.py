import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import crud, schemas, database

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/kpis")
def get_kpis(
    period: str = "last_30",  # today, last_7, last_30, last_90, year
    db: Session = Depends(database.get_db)
):
    """Get KPIs for dashboard"""
    # Calculate date range
    now = datetime.now()
    if period == "today":
        from_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "last_7":
        from_date = now - timedelta(days=7)
    elif period == "last_30":
        from_date = now - timedelta(days=30)
    elif period == "last_90":
        from_date = now - timedelta(days=90)
    elif period == "year":
        from_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        from_date = now - timedelta(days=30)
    
    return crud.get_dashboard_kpis(db, from_date=from_date, to_date=now)

@router.get("/sales-over-time")
def get_sales_over_time(
    period: str = "last_30",
    db: Session = Depends(database.get_db)
):
    """Get sales data over time for line chart"""
    now = datetime.now()
    if period == "last_7":
        from_date = now - timedelta(days=7)
    elif period == "last_30":
        from_date = now - timedelta(days=30)
    elif period == "last_90":
        from_date = now - timedelta(days=90)
    else:
        from_date = now - timedelta(days=30)
    
    return crud.get_sales_over_time(db, from_date=from_date, to_date=now)

@router.get("/top-products")
def get_top_products(
    limit: int = 10,
    period: str = "last_30",
    db: Session = Depends(database.get_db)
):
    """Get top selling products"""
    now = datetime.now()
    if period == "last_7":
        from_date = now - timedelta(days=7)
    elif period == "last_30":
        from_date = now - timedelta(days=30)
    elif period == "last_90":
        from_date = now - timedelta(days=90)
    else:
        from_date = now - timedelta(days=30)
    
    return crud.get_top_products(db, from_date=from_date, to_date=now, limit=limit)

@router.get("/stock-status")
def get_stock_status(db: Session = Depends(database.get_db)):
    """Get stock status distribution for doughnut chart"""
    return crud.get_stock_status_distribution(db)

@router.get("/profit-margin")
def get_profit_margin(
    period: str = "last_30",
    db: Session = Depends(database.get_db)
):
    """Get profit margin analysis"""
    now = datetime.now()
    if period == "last_30":
        from_date = now - timedelta(days=30)
    else:
        from_date = now - timedelta(days=30)
    
    return crud.get_profit_margin(db, from_date=from_date, to_date=now)
