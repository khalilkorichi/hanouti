import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import crud, schemas, database
from services import activity_service

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/", response_model=List[schemas.Product])
def get_products(
    skip: int = 0,
    limit: int = 100,
    query: Optional[str] = None,
    category_id: Optional[int] = None,
    sort: str = "name",
    db: Session = Depends(database.get_db)
):
    """Get all products with optional filters"""
    products = crud.get_products(
        db,
        skip=skip,
        limit=limit,
        query=query,
        category_id=category_id,
        sort=sort
    )
    return products

@router.get("/count")
def get_products_count(
    query: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    """Get total count of products"""
    count = crud.get_products_count(db, query=query, category_id=category_id)
    return {"count": count}

@router.get("/by-barcode/{barcode}", response_model=schemas.Product)
def get_product_by_barcode(barcode: str, db: Session = Depends(database.get_db)):
    """Exact-match barcode lookup for cashier quick-add. Returns 404 if not found
    so the frontend can fall back to fuzzy search or surface a 'not found' toast."""
    product = crud.get_product_by_barcode(db, barcode=barcode)
    if not product:
        raise HTTPException(status_code=404, detail="Product with this barcode not found")
    return product

@router.get("/{product_id}", response_model=schemas.Product)
def get_product(product_id: int, db: Session = Depends(database.get_db)):
    """Get a specific product"""
    product = crud.get_product(db, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/", response_model=schemas.Product, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    """Create a new product"""
    try:
        new_product = crud.create_product(db=db, product=product)
        activity_service.log(
            None,
            action="product.created",
            summary=f"إضافة منتج: {new_product.name}",
            entity_type="product",
            entity_id=new_product.id,
            severity=activity_service.SEVERITY_SUCCESS,
            meta={
                "name": new_product.name,
                "sale_price": new_product.sale_price,
                "stock_qty": new_product.stock_qty,
            },
        )
        return new_product
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int,
    product: schemas.ProductUpdate,
    db: Session = Depends(database.get_db)
):
    """Update a product"""
    try:
        updated_product = crud.update_product(db, product_id=product_id, product=product)
        if not updated_product:
            raise HTTPException(status_code=404, detail="Product not found")
        # Only include fields the user actually set, to keep the meta payload lean.
        changed = product.model_dump(exclude_unset=True) if hasattr(product, "model_dump") else {}
        activity_service.log(
            None,
            action="product.updated",
            summary=f"تعديل منتج: {updated_product.name}",
            entity_type="product",
            entity_id=updated_product.id,
            severity=activity_service.SEVERITY_INFO,
            meta={"changed_fields": list(changed.keys())},
        )
        return updated_product
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(database.get_db)):
    """Delete a product"""
    try:
        existing = crud.get_product(db, product_id=product_id)
        success = crud.delete_product(db, product_id=product_id)
        if not success:
            raise HTTPException(status_code=404, detail="المنتج غير موجود")
        if existing is not None:
            activity_service.log(
                None,
                action="product.deleted",
                summary=f"حذف منتج: {existing.name}",
                entity_type="product",
                entity_id=product_id,
                severity=activity_service.SEVERITY_WARNING,
                meta={"name": existing.name},
            )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="لا يمكن حذف هذا المنتج لأنه مرتبط بفواتير مبيعات موجودة"
        )
    return None

@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def create_products_bulk(products: List[schemas.ProductCreate], db: Session = Depends(database.get_db)):
    """Create multiple products at once (Import)"""
    result = crud.create_products_bulk(db=db, products=products)
    activity_service.log(
        None,
        action="product.bulk_imported",
        summary=f"استيراد جماعي للمنتجات: {len(products)} عنصر",
        severity=activity_service.SEVERITY_INFO,
        meta={"requested": len(products), "result": result if isinstance(result, dict) else None},
    )
    return result
