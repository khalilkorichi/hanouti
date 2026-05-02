import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import crud, database

router = APIRouter(prefix="/reports", tags=["reports"])


def _date_range(period: str):
    now = datetime.now()
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now
    if period == "last_7":
        return now - timedelta(days=7), now
    if period == "last_30":
        return now - timedelta(days=30), now
    if period == "last_90":
        return now - timedelta(days=90), now
    if period == "year":
        return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0), now
    return now - timedelta(days=30), now


@router.get("/kpis")
def get_kpis(period: str = "last_30", db: Session = Depends(database.get_db)):
    """KPIs with growth comparison vs previous equivalent period."""
    f, t = _date_range(period)
    return crud.get_kpis_with_comparison(db, from_date=f, to_date=t)


@router.get("/sales-over-time")
def get_sales_over_time(period: str = "last_30", db: Session = Depends(database.get_db)):
    f, t = _date_range(period)
    return crud.get_sales_over_time(db, from_date=f, to_date=t)


@router.get("/top-products")
def get_top_products(limit: int = 10, period: str = "last_30", db: Session = Depends(database.get_db)):
    f, t = _date_range(period)
    return crud.get_top_products(db, from_date=f, to_date=t, limit=limit)


@router.get("/stock-status")
def get_stock_status(db: Session = Depends(database.get_db)):
    return crud.get_stock_status_distribution(db)


@router.get("/profit-margin")
def get_profit_margin(period: str = "last_30", db: Session = Depends(database.get_db)):
    f, t = _date_range(period)
    return crud.get_profit_margin(db, from_date=f, to_date=t)


@router.get("/sales-by-category")
def get_sales_by_category(period: str = "last_30", db: Session = Depends(database.get_db)):
    f, t = _date_range(period)
    return crud.get_sales_by_category(db, from_date=f, to_date=t)


@router.get("/payment-methods")
def get_payment_methods(period: str = "last_30", db: Session = Depends(database.get_db)):
    f, t = _date_range(period)
    return crud.get_payment_methods(db, from_date=f, to_date=t)


@router.get("/sales-by-weekday")
def get_sales_by_weekday(period: str = "last_30", db: Session = Depends(database.get_db)):
    f, t = _date_range(period)
    return crud.get_sales_by_weekday(db, from_date=f, to_date=t)


@router.get("/sales-by-hour")
def get_sales_by_hour(period: str = "last_30", db: Session = Depends(database.get_db)):
    f, t = _date_range(period)
    return crud.get_sales_by_hour(db, from_date=f, to_date=t)


@router.get("/inventory-value")
def get_inventory_value(db: Session = Depends(database.get_db)):
    return crud.get_inventory_value(db)
