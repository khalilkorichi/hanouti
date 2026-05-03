import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import crud, schemas, database
from services import activity_service

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=List[schemas.Customer])
def list_customers(
    q: Optional[str] = None,
    only_with_debt: bool = False,
    db: Session = Depends(database.get_db),
):
    return crud.get_customers(db, q=q, only_with_debt=only_with_debt)


@router.get("/debt-summary", response_model=schemas.CustomersDebtSummary)
def debt_summary(db: Session = Depends(database.get_db)):
    return crud.get_debt_summary(db)


@router.post("/", response_model=schemas.Customer, status_code=status.HTTP_201_CREATED)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(database.get_db)):
    try:
        c = crud.create_customer(db, payload)
        activity_service.log(
            None,
            action="customer.created",
            summary=f"إضافة عميل: {c.name}",
            entity_type="customer",
            entity_id=c.id,
            severity=activity_service.SEVERITY_SUCCESS,
            meta={"name": c.name, "phone": c.phone},
        )
        return c
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{customer_id}", response_model=schemas.Customer)
def get_customer(customer_id: int, db: Session = Depends(database.get_db)):
    c = crud.get_customer(db, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="العميل غير موجود")
    return c


@router.put("/{customer_id}", response_model=schemas.Customer)
def update_customer(customer_id: int, payload: schemas.CustomerUpdate, db: Session = Depends(database.get_db)):
    try:
        c = crud.update_customer(db, customer_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not c:
        raise HTTPException(status_code=404, detail="العميل غير موجود")
    activity_service.log(
        None,
        action="customer.updated",
        summary=f"تعديل عميل: {c.name}",
        entity_type="customer",
        entity_id=c.id,
        severity=activity_service.SEVERITY_INFO,
    )
    return c


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(database.get_db)):
    existing = crud.get_customer(db, customer_id)
    ok = crud.delete_customer(db, customer_id)
    if not ok:
        raise HTTPException(status_code=404, detail="العميل غير موجود")
    activity_service.log(
        None,
        action="customer.deleted",
        summary=f"حذف عميل: {existing.name if existing else customer_id}",
        entity_type="customer",
        entity_id=customer_id,
        severity=activity_service.SEVERITY_WARNING,
    )
    return None


@router.get("/{customer_id}/sales", response_model=List[schemas.Sale])
def customer_sales(customer_id: int, db: Session = Depends(database.get_db)):
    return crud.get_customer_sales(db, customer_id)


@router.get("/{customer_id}/payments", response_model=List[schemas.CustomerPayment])
def customer_payments(customer_id: int, db: Session = Depends(database.get_db)):
    return crud.get_customer_payments(db, customer_id)


@router.post(
    "/{customer_id}/payments",
    response_model=schemas.CustomerPayment,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    customer_id: int,
    payload: schemas.CustomerPaymentCreate,
    db: Session = Depends(database.get_db),
):
    try:
        p = crud.record_customer_payment(db, customer_id, payload)
        activity_service.log(
            None,
            action="customer.payment_recorded",
            summary=f"دفعة عميل #{customer_id}: {p.amount:.2f}",
            entity_type="customer",
            entity_id=customer_id,
            severity=activity_service.SEVERITY_SUCCESS,
            meta={"amount": p.amount, "method": p.method, "payment_id": p.id},
        )
        return p
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
