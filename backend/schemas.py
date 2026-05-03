from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ============ User Schemas ============
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    requires_password_change: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    requires_password_change: Optional[bool] = None

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    password: str

# ============ Category Schemas ============
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    color: Optional[str] = "#1976d2"
    icon: Optional[str] = "Category"
    display_order: int = 0

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None

class Category(CategoryBase):
    id: int
    created_at: datetime
    product_count: int = 0

    class Config:
        from_attributes = True

class CategoryReorderItem(BaseModel):
    id: int
    display_order: int

class CategoryReorderRequest(BaseModel):
    items: list["CategoryReorderItem"]

class CategoryBulkActionRequest(BaseModel):
    ids: list[int]
    action: str  # 'activate' | 'deactivate' | 'delete'

class CategoryBulkActionResult(BaseModel):
    success_count: int
    failed_count: int
    errors: list[dict] = []

# ============ Product Schemas ============
class ProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    purchase_price: float = 0.0
    sale_price: float = 0.0
    stock_qty: int = 0
    min_qty: int = 5
    unit: str = "piece"
    image_url: Optional[str] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    purchase_price: Optional[float] = None
    sale_price: Optional[float] = None
    stock_qty: Optional[int] = None
    min_qty: Optional[int] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: Optional[Category] = None

    class Config:
        from_attributes = True

# ============ Sales Schemas ============
from typing import List

class SaleItemBase(BaseModel):
    product_id: int
    qty: int = 1
    unit_price: float
    tax_rate: float = 0.0

class SaleItemCreate(SaleItemBase):
    pass

class SaleItem(SaleItemBase):
    id: int
    sale_id: int
    line_total: float
    product: Optional[Product] = None

    class Config:
        from_attributes = True

class SaleBase(BaseModel):
    payment_method: str = "cash"
    discount_value: float = 0.0
    discount_type: str = "fixed"
    tax_value: float = 0.0

class SaleCreate(SaleBase):
    items: List[SaleItemCreate]
    customer_id: Optional[int] = None
    paid_amount: Optional[float] = None

class SaleUpdate(BaseModel):
    status: Optional[str] = None
    paid_amount: Optional[float] = None

class CustomerLite(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True

class Sale(SaleBase):
    id: int
    invoice_no: str
    status: str
    subtotal: float
    total: float
    paid_amount: float
    due_amount: float
    customer_id: Optional[int] = None
    customer: Optional[CustomerLite] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[SaleItem] = []

    class Config:
        from_attributes = True

# ============ Customer Schemas ============
class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class Customer(CustomerBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_due: float = 0.0
    total_purchases: float = 0.0
    sales_count: int = 0

    class Config:
        from_attributes = True

# ============ Customer Payment Schemas ============
class CustomerPaymentBase(BaseModel):
    amount: float = Field(gt=0)
    method: str = "cash"
    notes: Optional[str] = None

class CustomerPaymentCreate(CustomerPaymentBase):
    pass

class CustomerPayment(CustomerPaymentBase):
    id: int
    customer_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CustomersDebtSummary(BaseModel):
    total_debt: float
    customers_with_debt: int

# ============ Sales Actions ============
class SaleCancelRequest(BaseModel):
    reason: str

# ============ Sales KPIs ============
class SalesKPIs(BaseModel):
    total_sales: float
    total_orders: int
    avg_order_value: float
    completed_sales: int
    cancelled_sales: int
    cash_sales: float
    card_sales: float

# ============ Stock Movement Schemas ============
class StockMovementBase(BaseModel):
    product_id: int
    change: int
    reason: str
    ref_type: Optional[str] = None
    ref_id: Optional[int] = None
    notes: Optional[str] = None

class StockMovementCreate(StockMovementBase):
    pass

class StockMovement(StockMovementBase):
    id: int
    created_at: datetime
    product: Optional[Product] = None

    class Config:
        from_attributes = True

# ============ Store Profile Schemas ============
class StoreProfileBase(BaseModel):
    store_name: Optional[str] = None
    business_type: Optional[str] = None
    staff_count: Optional[str] = None
    features_needed: Optional[list[str]] = None
    onboarding_completed: bool = False


class StoreProfileUpdate(BaseModel):
    store_name: Optional[str] = None
    business_type: Optional[str] = None
    staff_count: Optional[str] = None
    features_needed: Optional[list[str]] = None
    onboarding_completed: Optional[bool] = None


class StoreProfile(StoreProfileBase):
    id: int

    class Config:
        from_attributes = True


# ============ Inventory Adjustment ============
class InventoryAdjustment(BaseModel):
    new_qty: int
    reason: str
    notes: Optional[str] = None
