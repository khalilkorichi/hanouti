import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import crud, schemas, database
from services import activity_service

router = APIRouter(prefix="/sales", tags=["sales"])

@router.post("/", response_model=schemas.Sale, status_code=status.HTTP_201_CREATED)
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(database.get_db)):
    """Create a new sale (draft)"""
    try:
        result = crud.create_sale(db=db, sale=sale)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{sale_id}/complete", response_model=schemas.Sale)
def complete_sale(sale_id: int, db: Session = Depends(database.get_db)):
    """Complete a sale (deduct stock)"""
    try:
        result = crud.complete_sale(db=db, sale_id=sale_id)
        activity_service.log(
            None,
            action="sale.completed",
            summary=f"إتمام بيع: فاتورة {result.invoice_no} — الإجمالي {result.total:.2f}",
            entity_type="sale",
            entity_id=result.id,
            severity=activity_service.SEVERITY_SUCCESS,
            meta={
                "invoice_no": result.invoice_no,
                "total": result.total,
                "paid": result.paid_amount,
                "due": result.due_amount,
                "payment_method": result.payment_method,
            },
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{sale_id}/cancel")
def cancel_sale(
    sale_id: int, 
    reason: schemas.SaleCancelRequest,
    db: Session = Depends(database.get_db)
):
    """Cancel a sale and reverse stock movements"""
    try:
        result = crud.cancel_sale(db=db, sale_id=sale_id, reason=reason.reason)
        activity_service.log(
            None,
            action="sale.cancelled",
            summary=f"إلغاء فاتورة #{sale_id}",
            entity_type="sale",
            entity_id=sale_id,
            severity=activity_service.SEVERITY_WARNING,
            meta={"reason": reason.reason},
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/anonymous-debts", response_model=List[schemas.Sale])
def list_anonymous_debts(db: Session = Depends(database.get_db)):
    """List sales with outstanding debt and no attached customer."""
    return crud.list_anonymous_debt_sales(db)


@router.post("/{sale_id}/assign-customer", response_model=schemas.Sale)
def assign_customer(
    sale_id: int,
    payload: schemas.AssignCustomerRequest,
    db: Session = Depends(database.get_db),
):
    """Attach an existing customer to a sale (typically used to convert
    anonymous debts into a named customer's debt)."""
    try:
        result = crud.assign_customer_to_sale(db, sale_id=sale_id, customer_id=payload.customer_id)
        activity_service.log(
            None,
            action="sale.customer_assigned",
            summary=f"ربط فاتورة #{sale_id} بعميل #{payload.customer_id}",
            entity_type="sale",
            entity_id=sale_id,
            severity=activity_service.SEVERITY_INFO,
            meta={"customer_id": payload.customer_id},
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[schemas.Sale])
def get_sales(
    skip: int = 0,
    limit: int = 50,
    query: Optional[str] = None,
    status: Optional[str] = None,
    payment_method: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get list of sales with advanced filtering"""
    return crud.get_sales(
        db, 
        skip=skip, 
        limit=limit, 
        query=query,
        status=status,
        payment_method=payment_method,
        from_date=from_date,
        to_date=to_date
    )

@router.get("/kpis/summary", response_model=schemas.SalesKPIs)
def get_sales_kpis(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get sales KPIs for a period"""
    return crud.get_sales_kpis(db, from_date=from_date, to_date=to_date)

@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(sale_id: int, db: Session = Depends(database.get_db)):
    """Permanently delete a sale and all its items"""
    existing = crud.get_sale(db, sale_id=sale_id)
    success = crud.delete_sale(db, sale_id=sale_id)
    if not success:
        raise HTTPException(status_code=404, detail="الفاتورة غير موجودة")
    activity_service.log(
        None,
        action="sale.deleted",
        summary=f"حذف فاتورة #{sale_id}" + (f" ({existing.invoice_no})" if existing else ""),
        entity_type="sale",
        entity_id=sale_id,
        severity=activity_service.SEVERITY_WARNING,
        meta={"invoice_no": existing.invoice_no if existing else None},
    )
    return None

@router.get("/{sale_id}", response_model=schemas.Sale)
def get_sale(sale_id: int, db: Session = Depends(database.get_db)):
    """Get sale details"""
    sale = crud.get_sale(db, sale_id=sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale
