import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import models, database, crud, schemas
from routers import (
    auth, products, categories, sales, inventory, reports, backup,
    store_profile, admin, customers, activity, app_settings,
)
from routers.backup import write_auto_backup
from services import activity_service, app_settings_service as cfg
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


async def _auto_backup_loop():
    """Periodic restore-point loop driven by user-configurable settings.

    Reads ``auto_backup.interval_minutes`` and ``auto_backup.enabled`` from the
    app_settings table on each tick (cheap KV read), so the user can change
    the schedule from Settings and have it take effect within ~60 seconds
    without restarting the backend.
    """
    import time

    # Initial snapshot shortly after startup so a fresh launch is always safe.
    await asyncio.sleep(5)
    last_run_epoch: float = 0.0
    # Tick frequency: small enough that schedule changes feel responsive but
    # large enough to avoid hammering the DB.
    TICK_SECONDS = 60

    while True:
        try:
            db = database.SessionLocal()
            try:
                interval_min = cfg.get_int(
                    db,
                    cfg.KEY_AUTO_BACKUP_INTERVAL_MIN,
                    cfg.DEFAULT_AUTO_BACKUP_INTERVAL_MIN,
                )
                enabled = cfg.get_bool(db, cfg.KEY_AUTO_BACKUP_ENABLED, True)
            finally:
                db.close()

            interval_sec = max(
                cfg.MIN_AUTO_BACKUP_INTERVAL_MIN,
                min(int(interval_min), cfg.MAX_AUTO_BACKUP_INTERVAL_MIN),
            ) * 60

            now = time.time()
            if enabled and (last_run_epoch == 0.0 or (now - last_run_epoch) >= interval_sec):
                path = write_auto_backup(tag="scheduled")
                last_run_epoch = now
                if path is not None:
                    activity_service.log(
                        None,
                        action="backup.scheduled_snapshot",
                        summary="تم إنشاء نقطة استعادة مجدولة",
                        severity=activity_service.SEVERITY_INFO,
                        meta={
                            "filename": path.name,
                            "interval_minutes": interval_min,
                        },
                    )
        except Exception as e:  # pragma: no cover
            print(f"[auto-backup] loop error: {e}")

        try:
            await asyncio.sleep(TICK_SECONDS)
        except asyncio.CancelledError:
            break


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = database.SessionLocal()
    try:
        user = crud.get_user_by_username(db, "admin")
        if not user:
            admin_user = schemas.UserCreate(username="admin", password="1234")
            crud.create_user(db, admin_user)
            print("Created default admin user with password: 1234")
        # Seed defaults so the GET endpoint always returns a sensible value.
        if cfg.get(db, cfg.KEY_AUTO_BACKUP_INTERVAL_MIN) is None:
            cfg.set_value(
                db,
                cfg.KEY_AUTO_BACKUP_INTERVAL_MIN,
                cfg.DEFAULT_AUTO_BACKUP_INTERVAL_MIN,
            )
        if cfg.get(db, cfg.KEY_AUTO_BACKUP_ENABLED) is None:
            cfg.set_value(db, cfg.KEY_AUTO_BACKUP_ENABLED, True)
    finally:
        db.close()

    activity_service.log(
        None,
        action="system.startup",
        summary="تم تشغيل الخادم",
        severity=activity_service.SEVERITY_INFO,
    )

    backup_task = asyncio.create_task(_auto_backup_loop())
    try:
        yield
    finally:
        backup_task.cancel()
        try:
            await backup_task
        except (asyncio.CancelledError, Exception):
            pass


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
app.include_router(activity.router)
app.include_router(app_settings.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Hanouti API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
