from sqlalchemy.orm import Session
from sqlalchemy import or_
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
def get_categories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Category).offset(skip).limit(limit).all()

def get_category(db: Session, category_id: int):
    return db.query(models.Category).filter(models.Category.id == category_id).first()

def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def update_category(db: Session, category_id: int, category: schemas.CategoryUpdate):
    db_category = get_category(db, category_id)
    if not db_category:
        return None
    
    update_data = category.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category

def delete_category(db: Session, category_id: int):
    db_category = get_category(db, category_id)
    if db_category:
        db.delete(db_category)
        db.commit()
        return True
    return False

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
    db_sale.due_amount = db_sale.total 
    
    db.commit()
    db.refresh(db_sale)
    return db_sale

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
