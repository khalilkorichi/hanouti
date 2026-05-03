"""
Administrative endpoints for destructive maintenance operations.

Currently exposes a single endpoint:
  POST /admin/factory-reset   — wipes all business data and resets the
                                store profile so the onboarding wizard
                                runs again on next launch. The default
                                admin user is preserved (so the user can
                                still log in afterwards).
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import models, database
from routers.backup import write_auto_backup
from services import activity_service

router = APIRouter(prefix="/admin", tags=["admin"])

CONFIRM_PHRASE = "RESET"


class FactoryResetRequest(BaseModel):
    confirm: str


@router.post("/factory-reset")
def factory_reset(
    payload: FactoryResetRequest,
    db: Session = Depends(database.get_db),
):
    """
    Permanently delete all business data and reset the store profile.
    Requires the request body to include `confirm: "RESET"` to guard
    against accidental wipes.

    Tables wiped (in FK-safe order):
      - sale_items
      - sales
      - customer_payments
      - customers
      - stock_movements
      - products
      - categories
      - store_profile (re-seeded as a single empty row)

    Preserved:
      - users  (the default admin / login credentials stay intact)
    """
    if payload.confirm != CONFIRM_PHRASE:
        raise HTTPException(
            status_code=400,
            detail=f"تأكيد غير صحيح. يجب إرسال كلمة التأكيد '{CONFIRM_PHRASE}'.",
        )

    # Take an automatic safety snapshot before wiping everything.
    try:
        write_auto_backup(tag="pre-reset")
    except Exception as e:  # pragma: no cover
        print(f"[factory-reset] pre-reset snapshot failed: {e}")

    try:
        # Delete in FK-safe order
        db.query(models.CustomerPaymentAllocation).delete(synchronize_session=False)
        db.query(models.SaleItem).delete(synchronize_session=False)
        db.query(models.Sale).delete(synchronize_session=False)
        db.query(models.CustomerPayment).delete(synchronize_session=False)
        db.query(models.Customer).delete(synchronize_session=False)
        db.query(models.StockMovement).delete(synchronize_session=False)
        db.query(models.Product).delete(synchronize_session=False)
        db.query(models.Category).delete(synchronize_session=False)
        db.query(models.StoreProfile).delete(synchronize_session=False)

        # Reset autoincrement / identity counters so new IDs start at 1 again.
        # Use a SAVEPOINT so any dialect-specific failure doesn't abort the
        # outer transaction.
        dialect = db.bind.dialect.name if db.bind is not None else ""
        tables = (
            "sale_items",
            "sales",
            "customer_payments",
            "customers",
            "stock_movements",
            "products",
            "categories",
            "store_profile",
        )
        try:
            with db.begin_nested():
                if dialect == "sqlite":
                    db.execute(
                        text(
                            "DELETE FROM sqlite_sequence WHERE name IN "
                            "('sale_items','sales','customer_payments',"
                            "'customers','stock_movements',"
                            "'products','categories','store_profile')"
                        )
                    )
                elif dialect == "postgresql":
                    for t in tables:
                        db.execute(
                            text(f'ALTER SEQUENCE IF EXISTS "{t}_id_seq" RESTART WITH 1')
                        )
        except Exception:
            # Sequence reset is best-effort; the data wipe itself succeeded.
            pass

        # Re-seed an empty store profile so /store-profile/ returns
        # onboarding_completed = false on next load.
        fresh = models.StoreProfile(onboarding_completed=False)
        db.add(fresh)

        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"فشل إعادة تعيين قاعدة البيانات: {e}",
        )

    activity_service.log(
        None,
        action="system.factory_reset",
        summary="تم إعادة ضبط البرنامج إلى الإعدادات الافتراضية",
        severity=activity_service.SEVERITY_CRITICAL,
    )

    return {
        "success": True,
        "message": "تم حذف جميع البيانات وإعادة ضبط البرنامج إلى الإعدادات الافتراضية.",
    }
