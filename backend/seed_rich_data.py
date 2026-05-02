"""Rich seed data for Hanouti POS - categories, products, sales over 90 days."""
import sys, random
from datetime import datetime, timedelta
sys.path.insert(0, '.')

from database import SessionLocal, engine
import models, crud, schemas

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

random.seed(42)

CATEGORIES = [
    ("مشروبات", "مشروبات غازية وعصائر وماء"),
    ("ألبان وأجبان", "حليب جبن لبن زبدة"),
    ("خبز ومعجنات", "خبز وكرواسون ومعجنات"),
    ("منظفات", "صابون ومنظفات منزلية"),
    ("حلويات", "شوكولاتة وبسكويت وحلويات"),
    ("مواد غذائية", "أرز سكر زيت معكرونة"),
    ("لحوم ودواجن", "لحم بقر دجاج"),
    ("خضروات وفواكه", "خضار طازج وفواكه موسمية"),
]

PRODUCTS = {
    "مشروبات": [
        ("كوكاكولا 1.5L", 80, 120), ("بيبسي 1.5L", 75, 110), ("سيدر 0.5L", 30, 50),
        ("ماء معدنية 1.5L", 25, 40), ("عصير برتقال", 60, 90), ("شاي بارد", 45, 70),
    ],
    "ألبان وأجبان": [
        ("حليب كامل 1L", 95, 130), ("لبن زبادي", 35, 55), ("جبن أبيض 250غ", 180, 240),
        ("زبدة 250غ", 220, 290), ("كريمة طبخ", 110, 160),
    ],
    "خبز ومعجنات": [
        ("خبز بلدي", 8, 15), ("خبز فرنسي", 12, 20), ("كرواسون", 35, 60),
        ("بريوش", 80, 120), ("بيتزا مجمدة", 200, 290),
    ],
    "منظفات": [
        ("سائل غسيل 2L", 320, 450), ("منظف أرضيات", 180, 260), ("صابون يد", 40, 65),
        ("معطر جو", 150, 220), ("منظف زجاج", 130, 190),
    ],
    "حلويات": [
        ("شوكولاتة كيندر", 60, 95), ("بسكويت أوريو", 35, 55), ("نوتيلا 350غ", 480, 680),
        ("حلوى مصاص", 5, 10), ("شيبس بطاطس", 25, 45),
    ],
    "مواد غذائية": [
        ("أرز 5كغ", 380, 520), ("سكر 1كغ", 75, 110), ("زيت طعام 5L", 850, 1200),
        ("معكرونة 500غ", 45, 75), ("ملح 1كغ", 25, 40), ("دقيق 1كغ", 50, 80),
    ],
    "لحوم ودواجن": [
        ("دجاج كامل", 380, 520), ("لحم بقري كغ", 1500, 2000), ("صدور دجاج كغ", 600, 850),
    ],
    "خضروات وفواكه": [
        ("بطاطا كغ", 40, 70), ("طماطم كغ", 60, 95), ("بصل كغ", 35, 60),
        ("تفاح كغ", 180, 250), ("موز كغ", 220, 320),
    ],
}

# Wipe sale data only (keep schema)
db.query(models.SaleItem).delete()
db.query(models.Sale).delete()
db.query(models.StockMovement).delete()
db.query(models.Product).delete()
db.query(models.Category).delete()
db.commit()

# Ensure admin
if not crud.get_user_by_username(db, "admin"):
    crud.create_user(db, schemas.UserCreate(username="admin", password="1234"))

# Categories
cat_objs = {}
for name, desc in CATEGORIES:
    c = models.Category(name=name, description=desc, is_active=True)
    db.add(c); db.commit(); db.refresh(c)
    cat_objs[name] = c

# Products
prod_objs = []
for cat_name, items in PRODUCTS.items():
    cat = cat_objs[cat_name]
    for idx, (pname, cost, price) in enumerate(items):
        stock = random.choice([0, 2, 5, 15, 30, 50, 80, 100, 150])
        min_q = random.choice([5, 10, 15])
        p = models.Product(
            name=pname, category_id=cat.id,
            purchase_price=cost, sale_price=price,
            stock_qty=stock, min_qty=min_q,
            unit="قطعة", is_active=True,
            sku=f"SKU-{cat.id:02d}{idx:02d}",
        )
        db.add(p)
        prod_objs.append(p)
db.commit()
for p in prod_objs:
    db.refresh(p)

print(f"Created {len(cat_objs)} categories, {len(prod_objs)} products")

# Sales over last 90 days with realistic patterns:
# - Weekends busier (Fri/Sat in Algeria week)
# - Hours: peak 11-14 and 17-21
# - Recent days slightly more sales (growing trend)
PAYMENT_METHODS = ["cash", "cash", "cash", "card", "card"]  # 60% cash, 40% card
total_sales_count = 0

now = datetime.now()
for days_ago in range(90, -1, -1):
    base_date = now - timedelta(days=days_ago)
    weekday = base_date.weekday()  # 0=Mon, 6=Sun

    # Algerian week: Friday(4) and Saturday(5) busier; growth trend in last 30 days
    busy_factor = 1.0
    if weekday in (4, 5): busy_factor = 1.6
    if weekday in (3,):   busy_factor = 1.2
    if days_ago < 30:     busy_factor *= 1.15  # recent uptick
    if days_ago < 7:      busy_factor *= 1.10

    num_sales = max(1, int(random.gauss(8, 2) * busy_factor))

    for _ in range(num_sales):
        # peak hours
        hour = random.choices(
            list(range(8, 23)),
            weights=[1, 2, 3, 5, 8, 10, 9, 5, 4, 6, 9, 11, 10, 8, 4],
        )[0]
        minute = random.randint(0, 59)
        ts = base_date.replace(hour=hour, minute=minute, second=random.randint(0, 59), microsecond=0)

        sale = models.Sale(
            invoice_no=f"INV-{ts.strftime('%Y%m%d%H%M%S')}-{random.randint(100, 999)}",
            status="completed",
            payment_method=random.choice(PAYMENT_METHODS),
            subtotal=0, discount_value=0, tax_value=0, total=0,
            paid_amount=0, due_amount=0,
            created_at=ts,
        )
        db.add(sale); db.commit(); db.refresh(sale)

        num_items = random.randint(1, 5)
        sale_total = 0
        chosen = random.sample(prod_objs, k=min(num_items, len(prod_objs)))
        for prod in chosen:
            qty = random.randint(1, 4)
            line = prod.sale_price * qty
            db.add(models.SaleItem(
                sale_id=sale.id, product_id=prod.id,
                qty=qty, unit_price=prod.sale_price,
                tax_rate=0, line_total=line,
            ))
            sale_total += line

        sale.subtotal = sale_total
        sale.total = sale_total
        sale.paid_amount = sale_total
        db.commit()
        total_sales_count += 1

print(f"Created {total_sales_count} sales across 90 days")
db.close()
print("Done.")
