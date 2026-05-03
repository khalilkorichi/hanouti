from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
from datetime import datetime
import models, schemas, security

# ============ User CRUD ============
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ============ Category CRUD ============
def _attach_product_count(db: Session, categories: List[models.Category]) -> List[dict]:
    """Attach product_count to each category and return as serialisable dicts."""
    if not categories:
        return []
    ids = [c.id for c in categories]
    counts = dict(
        db.query(models.Product.category_id, func.count(models.Product.id))
        .filter(models.Product.category_id.in_(ids))
        .group_by(models.Product.category_id)
        .all()
    )
    result = []
    for c in categories:
        d = {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "is_active": bool(c.is_active),
            "color": c.color or "#1976d2",
            "icon": c.icon or "Category",
            "display_order": c.display_order or 0,
            "created_at": c.created_at,
            "product_count": int(counts.get(c.id, 0)),
        }
        result.append(d)
    return result


def get_categories(
    db: Session,
    skip: int = 0,
    limit: int = 1000,
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort: str = "display_order",
):
    # Subquery: product count per category — used for both attach + ordering
    pc_subq = (
        db.query(
            models.Product.category_id.label("cid"),
            func.count(models.Product.id).label("cnt"),
        )
        .group_by(models.Product.category_id)
        .subquery()
    )
    pc_count = func.coalesce(pc_subq.c.cnt, 0)

    db_query = db.query(models.Category, pc_count.label("product_count")).outerjoin(
        pc_subq, pc_subq.c.cid == models.Category.id
    )

    if q:
        search = f"%{q}%"
        db_query = db_query.filter(
            or_(
                models.Category.name.ilike(search),
                models.Category.description.ilike(search),
            )
        )

    if is_active is not None:
        db_query = db_query.filter(models.Category.is_active == is_active)

    if sort == "name":
        db_query = db_query.order_by(models.Category.name)
    elif sort == "name_desc":
        db_query = db_query.order_by(models.Category.name.desc())
    elif sort == "created_at":
        db_query = db_query.order_by(models.Category.created_at.desc())
    elif sort == "product_count":
        # SQL-level ordering so pagination works correctly with large datasets
        db_query = db_query.order_by(pc_count.desc(), models.Category.name)
    else:  # display_order (default)
        db_query = db_query.order_by(
            models.Category.display_order, models.Category.name
        )

    rows = db_query.offset(skip).limit(limit).all()

    result = []
    for cat, count in rows:
        result.append({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "is_active": bool(cat.is_active),
            "color": cat.color or "#1976d2",
            "icon": cat.icon or "Category",
            "display_order": cat.display_order or 0,
            "created_at": cat.created_at,
            "product_count": int(count or 0),
        })
    return result


def get_category(db: Session, category_id: int):
    cat = (
        db.query(models.Category)
        .filter(models.Category.id == category_id)
        .first()
    )
    if not cat:
        return None
    enriched = _attach_product_count(db, [cat])
    return enriched[0] if enriched else None


def get_category_raw(db: Session, category_id: int):
    return (
        db.query(models.Category)
        .filter(models.Category.id == category_id)
        .first()
    )


def get_category_by_name(db: Session, name: str):
    return (
        db.query(models.Category)
        .filter(models.Category.name == name)
        .first()
    )


def create_category(db: Session, category: schemas.CategoryCreate):
    # Duplicate name guard
    existing = get_category_by_name(db, category.name)
    if existing:
        raise ValueError("اسم الفئة مستخدم بالفعل")

    # If display_order == 0, push to end
    data = category.model_dump()
    if not data.get("display_order"):
        max_order = (
            db.query(func.coalesce(func.max(models.Category.display_order), 0))
            .scalar() or 0
        )
        data["display_order"] = int(max_order) + 1

    db_category = models.Category(**data)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    enriched = _attach_product_count(db, [db_category])
    return enriched[0]


def update_category(db: Session, category_id: int, category: schemas.CategoryUpdate):
    db_category = get_category_raw(db, category_id)
    if not db_category:
        return None

    update_data = category.model_dump(exclude_unset=True)

    # Duplicate name guard (when changing name)
    if "name" in update_data and update_data["name"] != db_category.name:
        existing = get_category_by_name(db, update_data["name"])
        if existing and existing.id != category_id:
            raise ValueError("اسم الفئة مستخدم بالفعل")

    for field, value in update_data.items():
        setattr(db_category, field, value)

    db.commit()
    db.refresh(db_category)
    enriched = _attach_product_count(db, [db_category])
    return enriched[0]


def delete_category(db: Session, category_id: int):
    db_category = get_category_raw(db, category_id)
    if not db_category:
        return False, "الفئة غير موجودة"

    # Reject if linked products exist
    linked = (
        db.query(func.count(models.Product.id))
        .filter(models.Product.category_id == category_id)
        .scalar() or 0
    )
    if linked > 0:
        return False, f"لا يمكن حذف هذه الفئة لأنها مرتبطة بـ {linked} منتج"

    db.delete(db_category)
    db.commit()
    return True, None


def reorder_categories(db: Session, items: List[schemas.CategoryReorderItem]):
    """Update display_order for many categories in a single transaction."""
    if not items:
        return 0
    updated = 0
    try:
        for item in items:
            cat = get_category_raw(db, item.id)
            if cat:
                cat.display_order = item.display_order
                updated += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    return updated


def bulk_action_categories(
    db: Session, ids: List[int], action: str
) -> dict:
    """Apply an action to many categories. Returns counts and errors."""
    success = 0
    errors: List[dict] = []

    if action not in {"activate", "deactivate", "delete"}:
        return {"success_count": 0, "failed_count": len(ids),
                "errors": [{"id": None, "error": "إجراء غير صالح"}]}

    for cid in ids:
        cat = get_category_raw(db, cid)
        if not cat:
            errors.append({"id": cid, "error": "الفئة غير موجودة"})
            continue
        try:
            if action == "activate":
                cat.is_active = True
                success += 1
            elif action == "deactivate":
                cat.is_active = False
                success += 1
            elif action == "delete":
                linked = (
                    db.query(func.count(models.Product.id))
                    .filter(models.Product.category_id == cid)
                    .scalar() or 0
                )
                if linked > 0:
                    errors.append({
                        "id": cid,
                        "name": cat.name,
                        "error": f"مرتبطة بـ {linked} منتج",
                    })
                    continue
                db.delete(cat)
                success += 1
        except Exception as e:
            errors.append({"id": cid, "error": str(e)})

    db.commit()
    return {
        "success_count": success,
        "failed_count": len(errors),
        "errors": errors,
    }

# ============ Product CRUD ============
def get_products(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    query: Optional[str] = None,
    category_id: Optional[int] = None,
    sort: str = "name"
):
    db_query = db.query(models.Product)
    
    # Search filter
    if query:
        search = f"%{query}%"
        db_query = db_query.filter(
            or_(
                models.Product.name.ilike(search),
                models.Product.barcode.ilike(search),
                models.Product.sku.ilike(search)
            )
        )
    
    # Category filter
    if category_id:
        db_query = db_query.filter(models.Product.category_id == category_id)
    
    # Sorting
    if sort == "name":
        db_query = db_query.order_by(models.Product.name)
    elif sort == "price":
        db_query = db_query.order_by(models.Product.sale_price.desc())
    elif sort == "stock":
        db_query = db_query.order_by(models.Product.stock_qty)
    elif sort == "created_at":
        db_query = db_query.order_by(models.Product.created_at.desc())
    
    return db_query.offset(skip).limit(limit).all()

def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_barcode(db: Session, barcode: str):
    return db.query(models.Product).filter(models.Product.barcode == barcode).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def create_product(db: Session, product: schemas.ProductCreate):
    # Normalise empty strings → None for unique-nullable fields
    product_data = product.model_dump()
    if not product_data.get("barcode"):
        product_data["barcode"] = None
    if not product_data.get("sku"):
        product_data["sku"] = None

    # Check if barcode already exists
    if product_data["barcode"]:
        existing = get_product_by_barcode(db, product_data["barcode"])
        if existing:
            raise ValueError("Barcode already exists")

    if product_data["sku"]:
        existing = get_product_by_sku(db, product_data["sku"])
        if existing:
            raise ValueError("SKU already exists")

    db_product = models.Product(**product_data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    
    update_data = product.model_dump(exclude_unset=True)

    # Normalise empty strings → None for unique-nullable fields
    if "barcode" in update_data and not update_data["barcode"]:
        update_data["barcode"] = None
    if "sku" in update_data and not update_data["sku"]:
        update_data["sku"] = None

    # Check barcode uniqueness if being updated
    if "barcode" in update_data and update_data["barcode"] != db_product.barcode:
        if update_data["barcode"]:
            existing = get_product_by_barcode(db, update_data["barcode"])
            if existing:
                raise ValueError("Barcode already exists")

    # Check SKU uniqueness if being updated
    if "sku" in update_data and update_data["sku"] != db_product.sku:
        if update_data["sku"]:
            existing = get_product_by_sku(db, update_data["sku"])
            if existing:
                raise ValueError("SKU already exists")
    
    for field, value in update_data.items():
        setattr(db_product, field, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if db_product:
        db.delete(db_product)
        db.commit()
        return True
    return False

def get_products_count(db: Session, query: Optional[str] = None, category_id: Optional[int] = None):
    db_query = db.query(models.Product)
    
    if query:
        search = f"%{query}%"
        db_query = db_query.filter(
            or_(
                models.Product.name.ilike(search),
                models.Product.barcode.ilike(search),
                models.Product.sku.ilike(search)
            )
        )
    
    if category_id:
        db_query = db_query.filter(models.Product.category_id == category_id)
    
    return db_query.count()

def create_products_bulk(db: Session, products: List[schemas.ProductCreate]):
    created_products = []
    errors = []
    
    for product in products:
        try:
            # Check for duplicates
            if product.barcode:
                existing = get_product_by_barcode(db, product.barcode)
                if existing:
                    errors.append({"name": product.name, "error": f"Barcode {product.barcode} already exists"})
                    continue
            
            if product.sku:
                existing = get_product_by_sku(db, product.sku)
                if existing:
                    errors.append({"name": product.name, "error": f"SKU {product.sku} already exists"})
                    continue
            
            db_product = models.Product(**product.model_dump())
            db.add(db_product)
            db.commit()
            db.refresh(db_product)
            created_products.append(db_product)
        except Exception as e:
            db.rollback()
            errors.append({"name": product.name, "error": str(e)})
            
    return {"created_count": len(created_products), "errors": errors}

# ============ Sales CRUD ============
import time

def generate_invoice_no():
    return f"INV-{int(time.time()*1000)}"

def create_sale(db: Session, sale: schemas.SaleCreate):
    # Calculate totals
    subtotal = 0.0
    total_tax = 0.0
    
    db_sale = models.Sale(
        invoice_no=generate_invoice_no(),
        payment_method=sale.payment_method,
        discount_value=sale.discount_value,
        discount_type=sale.discount_type,
        customer_id=sale.customer_id,
        status="draft"
    )
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    
    for item in sale.items:
        line_total = item.qty * item.unit_price
        subtotal += line_total
        
        # Calculate tax for item (simplified)
        item_tax = line_total * (item.tax_rate / 100)
        total_tax += item_tax
        
        db_item = models.SaleItem(
            sale_id=db_sale.id,
            product_id=item.product_id,
            qty=item.qty,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            line_total=line_total
        )
        db.add(db_item)
    
    # Update sale totals
    db_sale.subtotal = subtotal
    db_sale.tax_value = total_tax
    
    # Apply discount
    discount_amount = 0.0
    if sale.discount_type == "percentage":
        discount_amount = subtotal * (sale.discount_value / 100)
    else:
        discount_amount = sale.discount_value
        
    db_sale.total = subtotal + total_tax - discount_amount

    # Apply paid_amount (defaults to full payment when omitted, preserving
    # legacy behaviour). When less than total, the remainder becomes due.
    paid = sale.paid_amount if sale.paid_amount is not None else db_sale.total
    if paid < 0:
        paid = 0.0
    if paid > db_sale.total:
        paid = db_sale.total
    db_sale.paid_amount = paid
    db_sale.due_amount = max(0.0, db_sale.total - paid)

    db.commit()
    db.refresh(db_sale)
    return db_sale


# ============ Customer CRUD ============
def _customer_aggregates(db: Session, customer_ids: list[int]) -> dict:
    """Returns {customer_id: (total_purchases, total_due, sales_count, last_sale_date)}"""
    if not customer_ids:
        return {}
    rows = (
        db.query(
            models.Sale.customer_id,
            func.coalesce(func.sum(models.Sale.total), 0.0),
            func.coalesce(func.sum(models.Sale.due_amount), 0.0),
            func.count(models.Sale.id),
            func.max(models.Sale.created_at),
        )
        .filter(
            models.Sale.customer_id.in_(customer_ids),
            models.Sale.status == "completed",
        )
        .group_by(models.Sale.customer_id)
        .all()
    )
    return {
        cid: (float(tp or 0), float(td or 0), int(cnt or 0), last)
        for cid, tp, td, cnt, last in rows
    }


def _serialize_customer(c: models.Customer, agg: tuple = (0.0, 0.0, 0, None)) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone,
        "notes": c.notes,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "total_purchases": agg[0] if len(agg) > 0 else 0.0,
        "total_due": agg[1] if len(agg) > 1 else 0.0,
        "sales_count": agg[2] if len(agg) > 2 else 0,
        "last_sale_date": agg[3] if len(agg) > 3 else None,
    }


def get_customers(db: Session, q: Optional[str] = None, only_with_debt: bool = False):
    query = db.query(models.Customer)
    if q:
        s = f"%{q}%"
        query = query.filter(or_(models.Customer.name.ilike(s), models.Customer.phone.ilike(s)))
    customers = query.order_by(models.Customer.name).all()
    aggs = _customer_aggregates(db, [c.id for c in customers])
    out = [_serialize_customer(c, aggs.get(c.id, (0.0, 0.0, 0, None))) for c in customers]
    if only_with_debt:
        out = [c for c in out if c["total_due"] > 0.0001]
    return out


def get_customer(db: Session, customer_id: int):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        return None
    aggs = _customer_aggregates(db, [c.id])
    return _serialize_customer(c, aggs.get(c.id, (0.0, 0.0, 0, None)))


def create_customer(db: Session, payload: schemas.CustomerCreate):
    phone = (payload.phone or "").strip() or None
    if phone:
        existing = db.query(models.Customer).filter(models.Customer.phone == phone).first()
        if existing:
            raise ValueError("رقم الهاتف مستخدم بالفعل لعميل آخر")
    c = models.Customer(name=payload.name.strip(), phone=phone, notes=payload.notes)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _serialize_customer(c, (0.0, 0.0, 0, None))


def update_customer(db: Session, customer_id: int, payload: schemas.CustomerUpdate):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        return None
    if payload.name is not None:
        c.name = payload.name.strip()
    if payload.phone is not None:
        new_phone = payload.phone.strip() or None
        if new_phone and new_phone != c.phone:
            existing = db.query(models.Customer).filter(
                models.Customer.phone == new_phone, models.Customer.id != customer_id
            ).first()
            if existing:
                raise ValueError("رقم الهاتف مستخدم بالفعل لعميل آخر")
        c.phone = new_phone
    if payload.notes is not None:
        c.notes = payload.notes
    db.commit()
    db.refresh(c)
    aggs = _customer_aggregates(db, [c.id])
    return _serialize_customer(c, aggs.get(c.id, (0.0, 0.0, 0, None)))


def delete_customer(db: Session, customer_id: int) -> bool:
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        return False
    # Detach from sales (preserve history) and delete payments via cascade
    db.query(models.Sale).filter(models.Sale.customer_id == customer_id).update(
        {models.Sale.customer_id: None}, synchronize_session=False
    )
    db.delete(c)
    db.commit()
    return True


def get_customer_sales(db: Session, customer_id: int):
    return (
        db.query(models.Sale)
        .filter(models.Sale.customer_id == customer_id)
        .order_by(models.Sale.created_at.desc())
        .all()
    )


def _serialize_payment(p: models.CustomerPayment) -> dict:
    return {
        "id": p.id,
        "customer_id": p.customer_id,
        "amount": float(p.amount or 0),
        "method": p.method,
        "notes": p.notes,
        "payment_date": p.payment_date or p.created_at,
        "created_at": p.created_at,
        "allocations": [
            {
                "sale_id": a.sale_id,
                "amount": float(a.amount or 0),
                "invoice_no": a.sale.invoice_no if a.sale else None,
            }
            for a in (p.allocations or [])
        ],
    }


def get_customer_payments(db: Session, customer_id: int):
    payments = (
        db.query(models.CustomerPayment)
        .filter(models.CustomerPayment.customer_id == customer_id)
        .order_by(models.CustomerPayment.created_at.desc())
        .all()
    )
    return [_serialize_payment(p) for p in payments]


def record_customer_payment(db: Session, customer_id: int, payload: schemas.CustomerPaymentCreate):
    """Record a payment and allocate it across the customer's unpaid completed sales.

    If `payload.sale_id` is provided, the payment is applied to that specific
    invoice first (capped at its outstanding due_amount); any remainder spills
    over to FIFO allocation. Otherwise pure FIFO (oldest unpaid first).
    Each cent is tracked via a CustomerPaymentAllocation row for auditing.
    """
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise ValueError("العميل غير موجود")
    if payload.amount <= 0:
        raise ValueError("يجب أن يكون المبلغ أكبر من صفر")

    # Cap the payment at the customer's total outstanding debt across all
    # completed sales — we don't currently model store credit, so accepting
    # an over-payment would leave un-allocated money in the ledger.
    total_due = db.query(func.coalesce(func.sum(models.Sale.due_amount), 0.0)).filter(
        models.Sale.customer_id == customer_id,
        models.Sale.status == "completed",
    ).scalar() or 0.0
    if float(payload.amount) > float(total_due) + 1e-6:
        raise ValueError(
            f"المبلغ يتجاوز الدين المستحق ({float(total_due):.2f} دج)."
        )

    payment = models.CustomerPayment(
        customer_id=customer_id,
        amount=payload.amount,
        method=payload.method,
        notes=payload.notes,
        payment_date=payload.payment_date,
    )
    db.add(payment)
    db.flush()  # need payment.id for allocations

    remaining = float(payload.amount)

    def _apply(sale: models.Sale, amt: float):
        nonlocal remaining
        if amt <= 0:
            return
        sale.paid_amount = float(sale.paid_amount or 0) + amt
        sale.due_amount = max(0.0, float(sale.due_amount or 0) - amt)
        db.add(models.CustomerPaymentAllocation(
            payment_id=payment.id, sale_id=sale.id, amount=amt,
        ))
        remaining -= amt

    # 1) Targeted allocation if sale_id was provided
    if payload.sale_id:
        target = (
            db.query(models.Sale)
            .filter(
                models.Sale.id == payload.sale_id,
                models.Sale.customer_id == customer_id,
                models.Sale.status == "completed",
            )
            .first()
        )
        if not target:
            raise ValueError("الفاتورة غير موجودة لهذا العميل")
        apply = min(remaining, float(target.due_amount or 0))
        _apply(target, apply)

    # 2) Spill remaining over the rest (oldest first), excluding the target if any
    if remaining > 0:
        q = db.query(models.Sale).filter(
            models.Sale.customer_id == customer_id,
            models.Sale.status == "completed",
            models.Sale.due_amount > 0,
        )
        if payload.sale_id:
            q = q.filter(models.Sale.id != payload.sale_id)
        for s in q.order_by(models.Sale.created_at.asc()).all():
            if remaining <= 0:
                break
            _apply(s, min(remaining, float(s.due_amount or 0)))

    db.commit()
    db.refresh(payment)
    return _serialize_payment(payment)


def list_anonymous_debt_sales(db: Session):
    """Sales with outstanding debt that have NO customer attached.
    These are 'ديون مجهولة الهوية' — partial walk-in deferred sales the user
    can later assign to a real customer."""
    return (
        db.query(models.Sale)
        .filter(
            models.Sale.customer_id.is_(None),
            models.Sale.status == "completed",
            models.Sale.due_amount > 0,
        )
        .order_by(models.Sale.created_at.desc())
        .all()
    )


def assign_customer_to_sale(db: Session, sale_id: int, customer_id: int):
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise ValueError("الفاتورة غير موجودة")
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise ValueError("العميل غير موجود")
    sale.customer_id = customer_id
    db.commit()
    db.refresh(sale)
    return sale


def get_debt_summary(db: Session):
    rows = (
        db.query(
            models.Sale.customer_id,
            func.sum(models.Sale.due_amount),
        )
        .filter(
            models.Sale.customer_id.isnot(None),
            models.Sale.status == "completed",
            models.Sale.due_amount > 0,
        )
        .group_by(models.Sale.customer_id)
        .all()
    )
    total = sum(float(d or 0) for _, d in rows)
    return {"total_debt": total, "customers_with_debt": len(rows)}

def get_sale(db: Session, sale_id: int):
    return db.query(models.Sale).filter(models.Sale.id == sale_id).first()

def get_sales(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    query: Optional[str] = None,
    status: Optional[str] = None,
    payment_method: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Get list of sales with advanced filtering"""
    from datetime import datetime
    db_query = db.query(models.Sale)
    
    # Search by invoice number
    if query:
        db_query = db_query.filter(models.Sale.invoice_no.ilike(f"%{query}%"))
    
    # Status filter
    if status:
        db_query = db_query.filter(models.Sale.status == status)
    
    # Payment method filter
    if payment_method:
        db_query = db_query.filter(models.Sale.payment_method == payment_method)
    
    # Date range filter
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            db_query = db_query.filter(models.Sale.created_at >= from_dt)
        except:
            pass
    
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            db_query = db_query.filter(models.Sale.created_at <= to_dt)
        except:
            pass
    
    return db_query.order_by(models.Sale.created_at.desc()).offset(skip).limit(limit).all()

def complete_sale(db: Session, sale_id: int):
    sale = get_sale(db, sale_id)
    if not sale:
        raise ValueError("Sale not found")
    
    if sale.status == "completed":
        raise ValueError("Sale already completed")
        
    # Check stock and deduct
    for item in sale.items:
        product = get_product(db, item.product_id)
        if not product:
             raise ValueError(f"Product {item.product_id} not found")
             
        if product.stock_qty < item.qty:
            raise ValueError(f"Insufficient stock for product {product.name}")
        
        # Deduct stock
        product.stock_qty -= item.qty
        
        # Create stock movement record
        create_stock_movement(
            db=db,
            product_id=item.product_id,
            change=-item.qty,
            reason="sale",
            ref_type="sale",
            ref_id=sale_id,
            notes=f"Sale #{sale.invoice_no}"
        )
        
    sale.status = "completed"
    # Preserve a partial payment when a customer is attached (deferred payment),
    # otherwise auto-fill as fully paid (legacy walk-in behaviour).
    if sale.customer_id:
        paid = float(sale.paid_amount or 0)
        if paid > sale.total:
            paid = sale.total
        sale.paid_amount = paid
        sale.due_amount = max(0.0, sale.total - paid)
    else:
        sale.paid_amount = sale.total
        sale.due_amount = 0
    
    db.commit()
    db.refresh(sale)
    return sale

def delete_sale(db: Session, sale_id: int) -> bool:
    """Hard delete a sale and all its items (cascades automatically)"""
    sale = get_sale(db, sale_id)
    if not sale:
        return False
    # Reverse stock if the sale was completed before deleting
    if sale.status == "completed":
        for item in sale.items:
            product = get_product(db, item.product_id)
            if product:
                product.stock_qty += item.qty
    # Defensively remove any payment allocations referencing this sale.
    # The FK is declared ON DELETE CASCADE, but on SQLite legacy DBs the
    # cascade may not fire if the table was created before the migration.
    db.query(models.CustomerPaymentAllocation).filter(
        models.CustomerPaymentAllocation.sale_id == sale_id
    ).delete(synchronize_session=False)
    db.delete(sale)
    db.commit()
    return True

def cancel_sale(db: Session, sale_id: int, reason: str):
    """Cancel a sale and reverse stock movements"""
    sale = get_sale(db, sale_id)
    if not sale:
        raise ValueError("Sale not found")
    
    if sale.status == "cancelled":
        raise ValueError("Sale already cancelled")
    
    # Reverse stock if sale was completed
    if sale.status == "completed":
        for item in sale.items:
            product = get_product(db, item.product_id)
            if product:
                # Return stock
                product.stock_qty += item.qty
                
                # Create stock movement record for cancellation
                create_stock_movement(
                    db=db,
                    product_id=item.product_id,
                    change=item.qty,
                    reason="cancel",
                    ref_type="sale",
                    ref_id=sale_id,
                    notes=f"Cancel sale #{sale.invoice_no}: {reason}"
                )
    
    sale.status = "cancelled"
    # Could add a cancel_reason field to the model later
    
    db.commit()
    db.refresh(sale)
    return sale

def get_sales_kpis(db: Session, from_date: Optional[str] = None, to_date: Optional[str] = None):
    """Calculate sales KPIs for a given period"""
    from datetime import datetime
    from sqlalchemy import func
    
    db_query = db.query(models.Sale)
    
    # Apply date filters
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            db_query = db_query.filter(models.Sale.created_at >= from_dt)
        except:
            pass
    
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            db_query = db_query.filter(models.Sale.created_at <= to_dt)
        except:
            pass
    
    all_sales = db_query.all()
    
    # Calculate KPIs
    total_orders = len(all_sales)
    completed_sales = len([s for s in all_sales if s.status == "completed"])
    cancelled_sales = len([s for s in all_sales if s.status == "cancelled"])
    
    total_sales = sum(s.total for s in all_sales if s.status == "completed")
    cash_sales = sum(s.total for s in all_sales if s.status == "completed" and s.payment_method == "cash")
    card_sales = sum(s.total for s in all_sales if s.status == "completed" and s.payment_method == "card")
    
    avg_order_value = total_sales / completed_sales if completed_sales > 0 else 0
    
    return {
        "total_sales": total_sales,
        "total_orders": total_orders,
        "avg_order_value": avg_order_value,
        "completed_sales": completed_sales,
        "cancelled_sales": cancelled_sales,
        "cash_sales": cash_sales,
        "card_sales": card_sales
    }

# ============ Inventory & Stock Movement CRUD ============
def get_inventory(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    query: Optional[str] = None,
    category_id: Optional[int] = None,
    stock_status: Optional[str] = None  # 'low', 'out', 'ok'
):
    """Get inventory with stock status indicators"""
    db_query = db.query(models.Product)
    
    # Search filter
    if query:
        search = f"%{query}%"
        db_query = db_query.filter(
            or_(
                models.Product.name.ilike(search),
                models.Product.barcode.ilike(search),
                models.Product.sku.ilike(search)
            )
        )
    
    # Category filter
    if category_id:
        db_query = db_query.filter(models.Product.category_id == category_id)
    
    # Stock status filter
    if stock_status == 'out':
        db_query = db_query.filter(models.Product.stock_qty <= 0)
    elif stock_status == 'low':
        db_query = db_query.filter(
            models.Product.stock_qty > 0,
            models.Product.stock_qty <= models.Product.min_qty
        )
    elif stock_status == 'ok':
        db_query = db_query.filter(models.Product.stock_qty > models.Product.min_qty)
    
    return db_query.order_by(models.Product.name).offset(skip).limit(limit).all()

def create_stock_movement(
    db: Session,
    product_id: int,
    change: int,
    reason: str,
    ref_type: Optional[str] = None,
    ref_id: Optional[int] = None,
    notes: Optional[str] = None
):
    """Create a stock movement record"""
    movement = models.StockMovement(
        product_id=product_id,
        change=change,
        reason=reason,
        ref_type=ref_type,
        ref_id=ref_id,
        notes=notes
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement

def get_stock_movements(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    product_id: Optional[int] = None,
    reason: Optional[str] = None
):
    """Get stock movements with optional filtering"""
    db_query = db.query(models.StockMovement)
    
    if product_id:
        db_query = db_query.filter(models.StockMovement.product_id == product_id)
    
    if reason:
        db_query = db_query.filter(models.StockMovement.reason == reason)
    
    return db_query.order_by(models.StockMovement.created_at.desc()).offset(skip).limit(limit).all()

def adjust_product_stock(
    db: Session,
    product_id: int,
    new_qty: int,
    reason: str,
    notes: Optional[str] = None
):
    """Adjust product stock quantity and create movement record"""
    product = get_product(db, product_id)
    if not product:
        raise ValueError("Product not found")
    
    old_qty = product.stock_qty
    change = new_qty - old_qty
    
    # Update stock
    product.stock_qty = new_qty
    
    # Create movement record
    create_stock_movement(
        db=db,
        product_id=product_id,
        change=change,
        reason=reason,
        ref_type="manual",
        notes=notes
    )
    
    db.commit()
    db.refresh(product)
    return product

def get_low_stock_products(db: Session):
    """Get products with stock below minimum quantity"""
    return db.query(models.Product).filter(
        models.Product.stock_qty > 0,
        models.Product.stock_qty <= models.Product.min_qty,
        models.Product.is_active == True
    ).all()

def get_out_of_stock_products(db: Session):
    """Get products that are out of stock"""
    return db.query(models.Product).filter(
        models.Product.stock_qty <= 0,
        models.Product.is_active == True
    ).all()

# ============ Reports & Analytics ============
def get_dashboard_kpis(db: Session, from_date: datetime, to_date: datetime):
    """Get comprehensive KPIs for dashboard"""
    from sqlalchemy import func, and_
    
    # Total sales
    sales_result = db.query(
        func.sum(models.Sale.total).label('total_sales'),
        func.count(models.Sale.id).label('total_orders'),
        func.avg(models.Sale.total).label('avg_order_value')
    ).filter(
        and_(
            models.Sale.created_at >= from_date,
            models.Sale.created_at <= to_date,
            models.Sale.status == 'completed'
        )
    ).first()
    
    total_sales = sales_result.total_sales or 0
    total_orders = sales_result.total_orders or 0
    avg_order_value = sales_result.avg_order_value or 0
    
    # Profit calculation
    profit_result = db.query(
        func.sum((models.SaleItem.unit_price - models.Product.purchase_price) * models.SaleItem.qty).label('profit')
    ).select_from(models.SaleItem).join(
        models.Product, models.SaleItem.product_id == models.Product.id
    ).join(
        models.Sale, models.SaleItem.sale_id == models.Sale.id
    ).filter(
        and_(
            models.Sale.created_at >= from_date,
            models.Sale.created_at <= to_date,
            models.Sale.status == 'completed'
        )
    ).first()
    
    net_profit = profit_result.profit or 0
    
    # Low stock count
    low_stock_count = db.query(func.count(models.Product.id)).filter(
        models.Product.stock_qty > 0,
        models.Product.stock_qty <= models.Product.min_qty,
        models.Product.is_active == True
    ).scalar()
    
    # Out of stock count
    out_of_stock_count = db.query(func.count(models.Product.id)).filter(
        models.Product.stock_qty <= 0,
        models.Product.is_active == True
    ).scalar()
    
    return {
        "total_sales": float(total_sales),
        "total_orders": int(total_orders),
        "avg_order_value": float(avg_order_value),
        "net_profit": float(net_profit),
        "low_stock_count": int(low_stock_count or 0),
        "out_of_stock_count": int(out_of_stock_count or 0)
    }

def get_sales_over_time(db: Session, from_date: datetime, to_date: datetime):
    """Get sales data grouped by date for charts"""
    from sqlalchemy import func, and_, cast, Date
    
    result = db.query(
        cast(models.Sale.created_at, Date).label('date'),
        func.sum(models.Sale.total).label('total'),
        func.count(models.Sale.id).label('count')
    ).filter(
        and_(
            models.Sale.created_at >= from_date,
            models.Sale.created_at <= to_date,
            models.Sale.status == 'completed'
        )
    ).group_by(
        cast(models.Sale.created_at, Date)
    ).order_by(
        cast(models.Sale.created_at, Date)
    ).all()
    
    return [
        {
            "date": str(row.date),
            "total": float(row.total or 0),
            "count": int(row.count or 0)
        }
        for row in result
    ]

def get_top_products(db: Session, from_date: datetime, to_date: datetime, limit: int = 10):
    """Get top selling products"""
    from sqlalchemy import func, and_
    
    result = db.query(
        models.Product.id,
        models.Product.name,
        func.sum(models.SaleItem.qty).label('total_qty'),
        func.sum(models.SaleItem.line_total).label('total_revenue')
    ).join(
        models.SaleItem, models.Product.id == models.SaleItem.product_id
    ).join(
        models.Sale, models.SaleItem.sale_id == models.Sale.id
    ).filter(
        and_(
            models.Sale.created_at >= from_date,
            models.Sale.created_at <= to_date,
            models.Sale.status == 'completed'
        )
    ).group_by(
        models.Product.id,
        models.Product.name
    ).order_by(
        func.sum(models.SaleItem.line_total).desc()
    ).limit(limit).all()
    
    return [
        {
            "id": row.id,
            "name": row.name,
            "total_qty": int(row.total_qty or 0),
            "total_revenue": float(row.total_revenue or 0)
        }
        for row in result
    ]

def get_stock_status_distribution(db: Session):
    """Get stock status distribution for doughnut chart"""
    from sqlalchemy import func, and_, case
    
    # Count products in each status
    ok_count = db.query(func.count(models.Product.id)).filter(
        models.Product.stock_qty > models.Product.min_qty,
        models.Product.is_active == True
    ).scalar() or 0
    
    low_count = db.query(func.count(models.Product.id)).filter(
        and_(
            models.Product.stock_qty > 0,
            models.Product.stock_qty <= models.Product.min_qty,
            models.Product.is_active == True
        )
    ).scalar() or 0
    
    out_count = db.query(func.count(models.Product.id)).filter(
        models.Product.stock_qty <= 0,
        models.Product.is_active == True
    ).scalar() or 0
    
    return {
        "ok": int(ok_count),
        "low": int(low_count),
        "out": int(out_count)
    }

def get_kpis_with_comparison(db: Session, from_date: datetime, to_date: datetime):
    """KPIs with comparison vs equivalent previous period."""
    period_len = to_date - from_date
    prev_from = from_date - period_len
    prev_to = from_date

    current = get_dashboard_kpis(db, from_date=from_date, to_date=to_date)
    previous = get_dashboard_kpis(db, from_date=prev_from, to_date=prev_to)

    def pct(c, p):
        if p == 0:
            return 100.0 if c > 0 else 0.0
        return ((c - p) / p) * 100.0

    return {
        **current,
        "previous": {
            "total_sales": previous["total_sales"],
            "total_orders": previous["total_orders"],
            "avg_order_value": previous["avg_order_value"],
            "net_profit": previous["net_profit"],
        },
        "growth": {
            "total_sales": pct(current["total_sales"], previous["total_sales"]),
            "total_orders": pct(current["total_orders"], previous["total_orders"]),
            "avg_order_value": pct(current["avg_order_value"], previous["avg_order_value"]),
            "net_profit": pct(current["net_profit"], previous["net_profit"]),
        },
    }


def get_sales_by_category(db: Session, from_date: datetime, to_date: datetime):
    """Sales grouped by product category."""
    from sqlalchemy import func, and_
    rows = db.query(
        models.Category.id,
        models.Category.name,
        func.sum(models.SaleItem.line_total).label("revenue"),
        func.sum(models.SaleItem.qty).label("qty"),
        func.count(models.SaleItem.id).label("items"),
    ).select_from(models.Category).join(
        models.Product, models.Product.category_id == models.Category.id
    ).join(
        models.SaleItem, models.SaleItem.product_id == models.Product.id
    ).join(
        models.Sale, models.SaleItem.sale_id == models.Sale.id
    ).filter(
        and_(
            models.Sale.created_at >= from_date,
            models.Sale.created_at <= to_date,
            models.Sale.status == "completed",
        )
    ).group_by(models.Category.id, models.Category.name).order_by(
        func.sum(models.SaleItem.line_total).desc()
    ).all()
    return [
        {"id": r.id, "name": r.name,
         "revenue": float(r.revenue or 0), "qty": int(r.qty or 0), "items": int(r.items or 0)}
        for r in rows
    ]


def get_payment_methods(db: Session, from_date: datetime, to_date: datetime):
    """Payment methods distribution."""
    from sqlalchemy import func, and_
    rows = db.query(
        models.Sale.payment_method,
        func.count(models.Sale.id).label("count"),
        func.sum(models.Sale.total).label("total"),
    ).filter(
        and_(
            models.Sale.created_at >= from_date,
            models.Sale.created_at <= to_date,
            models.Sale.status == "completed",
        )
    ).group_by(models.Sale.payment_method).all()
    return [
        {"method": r.payment_method, "count": int(r.count or 0), "total": float(r.total or 0)}
        for r in rows
    ]


def get_sales_by_weekday(db: Session, from_date: datetime, to_date: datetime):
    """Sales grouped by weekday (0=Mon ... 6=Sun)."""
    from sqlalchemy import and_
    rows = db.query(models.Sale.created_at, models.Sale.total).filter(
        and_(
            models.Sale.created_at >= from_date,
            models.Sale.created_at <= to_date,
            models.Sale.status == "completed",
        )
    ).all()
    buckets = {i: {"count": 0, "total": 0.0} for i in range(7)}
    for created_at, total in rows:
        wd = created_at.weekday()
        buckets[wd]["count"] += 1
        buckets[wd]["total"] += float(total or 0)
    names = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
    return [
        {"weekday": i, "name": names[i], "count": buckets[i]["count"], "total": buckets[i]["total"]}
        for i in range(7)
    ]


def get_sales_by_hour(db: Session, from_date: datetime, to_date: datetime):
    """Sales grouped by hour of day (0-23)."""
    from sqlalchemy import and_
    rows = db.query(models.Sale.created_at, models.Sale.total).filter(
        and_(
            models.Sale.created_at >= from_date,
            models.Sale.created_at <= to_date,
            models.Sale.status == "completed",
        )
    ).all()
    buckets = {i: {"count": 0, "total": 0.0} for i in range(24)}
    for created_at, total in rows:
        h = created_at.hour
        buckets[h]["count"] += 1
        buckets[h]["total"] += float(total or 0)
    return [
        {"hour": i, "label": f"{i:02d}:00", "count": buckets[i]["count"], "total": buckets[i]["total"]}
        for i in range(24)
    ]


def get_inventory_value(db: Session):
    """Total inventory value (cost & retail) + stock-related counts."""
    from sqlalchemy import func
    cost_value = db.query(
        func.sum(models.Product.purchase_price * models.Product.stock_qty)
    ).filter(models.Product.is_active == True).scalar() or 0
    retail_value = db.query(
        func.sum(models.Product.sale_price * models.Product.stock_qty)
    ).filter(models.Product.is_active == True).scalar() or 0
    total_units = db.query(func.sum(models.Product.stock_qty)).filter(
        models.Product.is_active == True
    ).scalar() or 0
    total_skus = db.query(func.count(models.Product.id)).filter(
        models.Product.is_active == True
    ).scalar() or 0
    potential_profit = float(retail_value) - float(cost_value)
    return {
        "cost_value": float(cost_value),
        "retail_value": float(retail_value),
        "potential_profit": potential_profit,
        "total_units": int(total_units),
        "total_skus": int(total_skus),
    }


def get_profit_margin(db: Session, from_date: datetime, to_date: datetime):
    """Calculate profit margin for the period"""
    from sqlalchemy import func, and_
    
    # Total revenue
    revenue = db.query(
        func.sum(models.Sale.total)
    ).filter(
        and_(
            models.Sale.created_at >= from_date,
            models.Sale.created_at <= to_date,
            models.Sale.status == 'completed'
        )
    ).scalar() or 0
    
    # Total cost
    cost = db.query(
        func.sum(models.Product.purchase_price * models.SaleItem.qty)
    ).select_from(models.SaleItem).join(
        models.Product, models.SaleItem.product_id == models.Product.id
    ).join(
        models.Sale, models.SaleItem.sale_id == models.Sale.id
    ).filter(
        and_(
            models.Sale.created_at >= from_date,
            models.Sale.created_at <= to_date,
            models.Sale.status == 'completed'
        )
    ).scalar() or 0
    
    profit = revenue - cost
    margin = (profit / revenue * 100) if revenue > 0 else 0
    
    return {
        "revenue": float(revenue),
        "cost": float(cost),
        "profit": float(profit),
        "margin_percentage": float(margin)
    }
