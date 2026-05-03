import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import crud, schemas, database
from services import activity_service

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=List[schemas.Category])
def get_categories(
    skip: int = 0,
    limit: int = 1000,
    q: Optional[str] = Query(None, description="بحث بالاسم/الوصف"),
    is_active: Optional[bool] = Query(None, description="فلترة بالحالة"),
    sort: str = Query("display_order", description="display_order|name|name_desc|created_at|product_count"),
    db: Session = Depends(database.get_db)
):
    """Get all categories with search/filter/sort support and product_count."""
    return crud.get_categories(
        db, skip=skip, limit=limit, q=q, is_active=is_active, sort=sort
    )

@router.put("/reorder", response_model=dict)
def reorder_categories(
    payload: schemas.CategoryReorderRequest,
    db: Session = Depends(database.get_db)
):
    """Update display_order for many categories at once."""
    try:
        updated = crud.reorder_categories(db, payload.items)
        return {"updated": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل تحديث الترتيب: {e}")

@router.post("/bulk-action", response_model=schemas.CategoryBulkActionResult)
def bulk_action_categories(
    payload: schemas.CategoryBulkActionRequest,
    db: Session = Depends(database.get_db)
):
    """Apply an action (activate/deactivate/delete) to many categories."""
    if payload.action not in {"activate", "deactivate", "delete"}:
        raise HTTPException(status_code=400, detail="إجراء غير صالح")
    if not payload.ids:
        raise HTTPException(status_code=400, detail="يجب تحديد فئة واحدة على الأقل")
    result = crud.bulk_action_categories(db, payload.ids, payload.action)
    sev = (
        activity_service.SEVERITY_WARNING
        if payload.action == "delete"
        else activity_service.SEVERITY_INFO
    )
    activity_service.log(
        None,
        action=f"category.bulk_{payload.action}",
        summary=f"إجراء جماعي على الفئات ({payload.action}): {len(payload.ids)}",
        severity=sev,
        meta={"ids": payload.ids, "action": payload.action},
    )
    return result

@router.get("/{category_id}", response_model=schemas.Category)
def get_category(category_id: int, db: Session = Depends(database.get_db)):
    """Get a specific category"""
    category = crud.get_category(db, category_id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    return category

@router.post("/", response_model=schemas.Category, status_code=status.HTTP_201_CREATED)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(database.get_db)):
    """Create a new category"""
    try:
        new_cat = crud.create_category(db=db, category=category)
        activity_service.log(
            None,
            action="category.created",
            summary=f"إضافة فئة: {new_cat.name}",
            entity_type="category",
            entity_id=new_cat.id,
            severity=activity_service.SEVERITY_SUCCESS,
            meta={"name": new_cat.name},
        )
        return new_cat
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{category_id}", response_model=schemas.Category)
def update_category(
    category_id: int,
    category: schemas.CategoryUpdate,
    db: Session = Depends(database.get_db)
):
    """Update a category"""
    try:
        updated_category = crud.update_category(db, category_id=category_id, category=category)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not updated_category:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    activity_service.log(
        None,
        action="category.updated",
        summary=f"تعديل فئة: {updated_category.name}",
        entity_type="category",
        entity_id=updated_category.id,
        severity=activity_service.SEVERITY_INFO,
    )
    return updated_category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(database.get_db)):
    """Delete a category (rejects if linked to products)."""
    existing = crud.get_category(db, category_id=category_id)
    success, error = crud.delete_category(db, category_id=category_id)
    if not success:
        # 404 only if not found, 400 if blocked by linked products
        if error == "الفئة غير موجودة":
            raise HTTPException(status_code=404, detail=error)
        raise HTTPException(status_code=400, detail=error or "تعذّر حذف الفئة")
    activity_service.log(
        None,
        action="category.deleted",
        summary=f"حذف فئة: {existing.name if existing else category_id}",
        entity_type="category",
        entity_id=category_id,
        severity=activity_service.SEVERITY_WARNING,
    )
    return None
