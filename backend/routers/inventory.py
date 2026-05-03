import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import crud, schemas, database
from services import activity_service

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("/", response_model=List[schemas.Product])
def get_inventory(
    skip: int = 0,
    limit: int = 100,
    query: Optional[str] = None,
    category_id: Optional[int] = None,
    stock_status: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get inventory with filters"""
    return crud.get_inventory(
        db,
        skip=skip,
        limit=limit,
        query=query,
        category_id=category_id,
        stock_status=stock_status
    )

@router.post("/{product_id}/adjust", response_model=schemas.Product)
def adjust_stock(
    product_id: int,
    adjustment: schemas.InventoryAdjustment,
    db: Session = Depends(database.get_db)
):
    """Adjust product stock quantity"""
    try:
        before = crud.get_product(db, product_id=product_id)
        before_qty = before.stock_qty if before else None
        result = crud.adjust_product_stock(
            db=db,
            product_id=product_id,
            new_qty=adjustment.new_qty,
            reason=adjustment.reason,
            notes=adjustment.notes
        )
        delta = (
            adjustment.new_qty - before_qty
            if before_qty is not None
            else None
        )
        activity_service.log(
            None,
            action="inventory.adjusted",
            summary=(
                f"تعديل مخزون: {result.name} "
                f"({before_qty if before_qty is not None else '?'} → {adjustment.new_qty})"
            ),
            entity_type="product",
            entity_id=product_id,
            severity=activity_service.SEVERITY_INFO,
            meta={
                "before": before_qty,
                "after": adjustment.new_qty,
                "delta": delta,
                "reason": adjustment.reason,
                "notes": adjustment.notes,
            },
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/stock-movements", response_model=List[schemas.StockMovement])
def get_stock_movements(
    skip: int = 0,
    limit: int = 100,
    product_id: Optional[int] = None,
    reason: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get stock movements with filters"""
    return crud.get_stock_movements(
        db,
        skip=skip,
        limit=limit,
        product_id=product_id,
        reason=reason
    )

@router.get("/alerts/low-stock", response_model=List[schemas.Product])
def get_low_stock_alerts(db: Session = Depends(database.get_db)):
    """Get products with low stock"""
    return crud.get_low_stock_products(db)

@router.get("/alerts/out-of-stock", response_model=List[schemas.Product])
def get_out_of_stock_alerts(db: Session = Depends(database.get_db)):
    """Get products that are out of stock"""
    return crud.get_out_of_stock_products(db)
