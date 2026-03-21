from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import random
import models, database

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=database.engine)
db = SessionLocal()

def create_mock_sales():
    print("Creating mock sales data...")
    
    # Get some products
    products = db.query(models.Product).all()
    
    if not products:
        print("No products found! Please add products first.")
        return

    # Create sales for the last 30 days
    for i in range(30):
        date = datetime.now() - timedelta(days=i)
        # Random number of sales per day (1-5)
        num_sales = random.randint(1, 5)
        
        for _ in range(num_sales):
            # Create sale
            sale = models.Sale(
                invoice_no=f"INV-{date.strftime('%Y%m%d')}-{random.randint(1000, 9999)}",
                status="completed",
                payment_method=random.choice(["cash", "card"]),
                subtotal=0,
                discount_value=0,
                tax_value=0,
                total=0,
                paid_amount=0,
                due_amount=0,
                created_at=date
            )
            db.add(sale)
            db.commit()
            db.refresh(sale)
            
            # Add items
            num_items = random.randint(1, 3)
            sale_total = 0
            
            for _ in range(num_items):
                product = random.choice(products)
                qty = random.randint(1, 5)
                price = product.sale_price
                line_total = price * qty
                
                item = models.SaleItem(
                    sale_id=sale.id,
                    product_id=product.id,
                    qty=qty,
                    unit_price=price,
                    tax_rate=0,
                    line_total=line_total
                )
                db.add(item)
                sale_total += line_total
                
                # Update stock (optional for mock data)
                # product.stock_qty -= qty
            
            # Update sale total
            sale.subtotal = sale_total
            sale.total = sale_total
            sale.paid_amount = sale_total
            db.commit()
            
    print("Mock sales data created successfully!")

if __name__ == "__main__":
    create_mock_sales()
