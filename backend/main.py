from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import models, database, crud, schemas
from routers import auth, products, categories, sales, inventory, reports, backup, store_profile, admin, customers
from sqlalchemy import text as _sql_text

models.Base.metadata.create_all(bind=database.engine)


def _run_lightweight_migrations():
    """Idempotent column additions for tables that pre-existed before new
    features were introduced (since we don't run Alembic in this project)."""
    try:
        dialect = database.engine.dialect.name
        with database.engine.begin() as conn:
            if dialect == "postgresql":
                conn.execute(_sql_text(
                    "ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id)"
                ))
                conn.execute(_sql_text(
                    "CREATE INDEX IF NOT EXISTS ix_sales_customer_id ON sales(customer_id)"
                ))
                conn.execute(_sql_text(
                    "ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ DEFAULT NOW()"
                ))
                # Allocations table is created by metadata.create_all on startup,
                # but ensure index exists for fast lookups by sale_id.
                conn.execute(_sql_text(
                    "CREATE INDEX IF NOT EXISTS ix_cust_pay_alloc_sale ON customer_payment_allocations(sale_id)"
                ))
            elif dialect == "sqlite":
                cols = [r[1] for r in conn.execute(_sql_text("PRAGMA table_info(sales)")).fetchall()]
                if "customer_id" not in cols:
                    conn.execute(_sql_text("ALTER TABLE sales ADD COLUMN customer_id INTEGER"))
                pcols = [r[1] for r in conn.execute(_sql_text("PRAGMA table_info(customer_payments)")).fetchall()]
                if pcols and "payment_date" not in pcols:
                    conn.execute(_sql_text("ALTER TABLE customer_payments ADD COLUMN payment_date DATETIME"))
    except Exception as e:  # pragma: no cover — best-effort
        print(f"[migrations] warning: {e}")


_run_lightweight_migrations()


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = database.SessionLocal()
    try:
        user = crud.get_user_by_username(db, "admin")
        if not user:
            admin_user = schemas.UserCreate(username="admin", password="1234")
            crud.create_user(db, admin_user)
            print("Created default admin user with password: 1234")
    finally:
        db.close()
    yield


app = FastAPI(title="Hanouti API", version="1.0.0", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(sales.router)
app.include_router(inventory.router)
app.include_router(reports.router)
app.include_router(backup.router)
app.include_router(store_profile.router)
app.include_router(admin.router)
app.include_router(customers.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Hanouti API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
