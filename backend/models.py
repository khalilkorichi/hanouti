from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    requires_password_change = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    color = Column(String, nullable=True, default="#1976d2")
    icon = Column(String, nullable=True, default="Category")
    display_order = Column(Integer, nullable=False, default=0, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    products = relationship("Product", back_populates="category")

    __table_args__ = (
        Index("ix_categories_order_name", "display_order", "name"),
    )

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    sku = Column(String, unique=True, index=True, nullable=True)
    barcode = Column(String, unique=True, index=True, nullable=True)
    
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="products")

    purchase_price = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)
    stock_qty = Column(Integer, default=0)
    min_qty = Column(Integer, default=5)
    unit = Column(String, default="piece")
    image_url = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    __table_args__ = (
        Index("ix_products_category_active", "category_id", "is_active"),
        Index("ix_products_stock_min", "stock_qty", "min_qty"),
        Index("ix_products_active_name", "is_active", "name"),
    )

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True, unique=True, index=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    sales = relationship("Sale", back_populates="customer")
    payments = relationship("CustomerPayment", back_populates="customer", cascade="all, delete-orphan")


class CustomerPayment(Base):
    __tablename__ = "customer_payments"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), index=True, nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    method = Column(String, default="cash")
    notes = Column(String, nullable=True)
    payment_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="payments")
    allocations = relationship(
        "CustomerPaymentAllocation",
        back_populates="payment",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_cust_pay_customer_created", "customer_id", "created_at"),
    )


class CustomerPaymentAllocation(Base):
    """Links a payment to the specific sale invoice it paid down — provides
    an auditable per-invoice ledger of how each payment was distributed."""
    __tablename__ = "customer_payment_allocations"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("customer_payments.id", ondelete="CASCADE"), nullable=False, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    payment = relationship("CustomerPayment", back_populates="allocations")
    sale = relationship("Sale")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String, unique=True, index=True)
    status = Column(String, default="draft") # draft, completed, cancelled
    payment_method = Column(String, default="cash") # cash, card, etc.

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    customer = relationship("Customer", back_populates="sales")

    subtotal = Column(Float, default=0.0)
    discount_value = Column(Float, default=0.0)
    discount_type = Column(String, default="fixed") # fixed, percentage
    tax_value = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    paid_amount = Column(Float, default=0.0)
    due_amount = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_sales_status_created", "status", "created_at"),
        Index("ix_sales_created_desc", "created_at"),
    )

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    
    qty = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.0)
    line_total = Column(Float, default=0.0)
    
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")

    __table_args__ = (
        Index("ix_sale_items_sale_product", "sale_id", "product_id"),
    )

class StoreProfile(Base):
    __tablename__ = "store_profile"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String, nullable=True)
    business_type = Column(String, nullable=True)
    staff_count = Column(String, nullable=True)
    features_needed = Column(String, nullable=True)  # comma-separated list
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    
    change = Column(Integer)  # Positive for increase, negative for decrease
    reason = Column(String)  # 'sale', 'adjustment', 'cancel', 'initial', etc.
    ref_type = Column(String, nullable=True)  # 'sale', 'manual', etc.
    ref_id = Column(Integer, nullable=True)  # Reference to sale_id or other
    notes = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    product = relationship("Product")

    __table_args__ = (
        Index("ix_stock_mov_product_created", "product_id", "created_at"),
    )

