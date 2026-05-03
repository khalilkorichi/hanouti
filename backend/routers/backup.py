"""
Backup & Restore router.

Capabilities:
  GET  /backup/export                       — download full snapshot (v1.1 + sha256)
  POST /backup/import                       — transactional restore from uploaded file
  GET  /backup/auto-list                    — list automatic snapshots on disk
  GET  /backup/auto-download/{filename}     — download a specific auto snapshot
  POST /backup/auto-restore/{filename}      — restore from a specific auto snapshot

Schema version: "1.1"
File integrity: SHA-256 over the canonical JSON of the `data` block, stored in
`meta.checksum`. Restore refuses files where the checksum or required tables
are missing.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text as _sql_text

from database import get_db, SessionLocal, engine
import models


router = APIRouter(prefix="/backup", tags=["backup"])

SCHEMA_VERSION = "1.1"
AUTO_BACKUP_KEEP = 7
AUTO_BACKUP_PREFIX = "hanouti_auto_"
AUTO_BACKUP_FILENAME_RE = re.compile(
    r"^hanouti_auto_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}(?:_[a-zA-Z0-9\-]+)?\.json$"
)

REQUIRED_TABLES = (
    "categories",
    "products",
    "customers",
    "customer_payments",
    "customer_payment_allocations",
    "sales",
    "sale_items",
    "stock_movements",
    "store_profile",
)


# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_backup_dir() -> Path:
    """Return the directory where automatic backups are written.

    Honours HANOUTI_BACKUP_DIR (set by the Electron launcher to the user-data
    directory). Falls back to ``backend/backups``.
    """
    env_dir = os.getenv("HANOUTI_BACKUP_DIR")
    if env_dir:
        p = Path(env_dir)
    else:
        p = Path(__file__).resolve().parent.parent / "backups"
    p.mkdir(parents=True, exist_ok=True)
    return p


# ─────────────────────────────────────────────────────────────────────────────
# Serialisation helpers
# ─────────────────────────────────────────────────────────────────────────────

def _serialize(instance: Any) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, value in instance.__dict__.items():
        if key.startswith("_sa_"):
            continue
        if isinstance(value, datetime):
            out[key] = value.isoformat()
        else:
            out[key] = value
    return out


def _checksum(data_block: Dict[str, Any]) -> str:
    canonical = json.dumps(data_block, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _build_snapshot(db: Session, tag: Optional[str] = None) -> Dict[str, Any]:
    """Materialise the full DB snapshot as a JSON-serialisable dict."""
    data = {
        "categories": [_serialize(r) for r in db.query(models.Category).all()],
        "products": [_serialize(r) for r in db.query(models.Product).all()],
        "customers": [_serialize(r) for r in db.query(models.Customer).all()],
        "customer_payments": [_serialize(r) for r in db.query(models.CustomerPayment).all()],
        "customer_payment_allocations": [
            _serialize(r) for r in db.query(models.CustomerPaymentAllocation).all()
        ],
        "sales": [_serialize(r) for r in db.query(models.Sale).all()],
        "sale_items": [_serialize(r) for r in db.query(models.SaleItem).all()],
        "stock_movements": [_serialize(r) for r in db.query(models.StockMovement).all()],
        "store_profile": [_serialize(r) for r in db.query(models.StoreProfile).all()],
    }
    meta = {
        "version": SCHEMA_VERSION,
        "date": datetime.now().isoformat(),
        "app": "Hanouti",
        "checksum": _checksum(data),
    }
    if tag:
        meta["tag"] = tag
    return {"meta": meta, "data": data}


def _summarize(snapshot: Dict[str, Any]) -> Dict[str, int]:
    d = snapshot.get("data", {}) or {}
    return {k: len(d.get(k, []) or []) for k in REQUIRED_TABLES}


# ─────────────────────────────────────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────────────────────────────────────

def _validate_snapshot(snapshot: Any) -> Dict[str, Any]:
    if not isinstance(snapshot, dict):
        raise HTTPException(status_code=400, detail="ملف النسخة الاحتياطية غير صالح.")
    meta = snapshot.get("meta")
    data = snapshot.get("data")
    if not isinstance(meta, dict) or not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="ملف النسخة الاحتياطية تالف أو غير مكتمل.")
    version = str(meta.get("version") or "")
    if version not in ("1.0", "1.1"):
        raise HTTPException(
            status_code=400,
            detail=f"إصدار النسخة الاحتياطية غير مدعوم: {version or 'غير محدد'}.",
        )
    # Required tables (1.0 may be missing customer/debt tables — fall back to empty)
    for t in REQUIRED_TABLES:
        if t not in data:
            data[t] = []
        if not isinstance(data[t], list):
            raise HTTPException(
                status_code=400,
                detail=f"بنية الجدول '{t}' غير صحيحة في ملف النسخة الاحتياطية.",
            )
    # Checksum check (only enforced for v1.1 — v1.0 had no checksum)
    if version == "1.1":
        expected = meta.get("checksum")
        if not expected:
            raise HTTPException(
                status_code=400,
                detail="ملف النسخة الاحتياطية يفتقد لخانة التحقق (checksum).",
            )
        actual = _checksum(data)
        if actual != expected:
            raise HTTPException(
                status_code=400,
                detail="فشل التحقق من سلامة الملف — قد يكون تالفاً أو معدلاً.",
            )
    return snapshot


# ─────────────────────────────────────────────────────────────────────────────
# Restore (single transaction)
# ─────────────────────────────────────────────────────────────────────────────

def _coerce_dt(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return value


def _filter_columns(model, row: Dict[str, Any], drop_id: bool = True) -> Dict[str, Any]:
    cols = {c.name for c in model.__table__.columns}
    out: Dict[str, Any] = {}
    for k, v in row.items():
        if k not in cols:
            continue
        if drop_id and k == "id":
            continue
        out[k] = v
    # Coerce datetime-looking columns
    for k in list(out.keys()):
        col = model.__table__.columns.get(k)
        if col is not None and "DATETIME" in str(col.type).upper() or (col is not None and "TIMESTAMP" in str(col.type).upper()):
            out[k] = _coerce_dt(out[k])
    return out


def _restore_snapshot(db: Session, snapshot: Dict[str, Any]) -> Dict[str, int]:
    """Wipe and re-insert all data inside a single transaction."""
    data = snapshot["data"]

    try:
        # 1) Wipe in FK-safe order
        db.query(models.CustomerPaymentAllocation).delete(synchronize_session=False)
        db.query(models.SaleItem).delete(synchronize_session=False)
        db.query(models.Sale).delete(synchronize_session=False)
        db.query(models.CustomerPayment).delete(synchronize_session=False)
        db.query(models.Customer).delete(synchronize_session=False)
        db.query(models.StockMovement).delete(synchronize_session=False)
        db.query(models.Product).delete(synchronize_session=False)
        db.query(models.Category).delete(synchronize_session=False)
        db.query(models.StoreProfile).delete(synchronize_session=False)
        db.flush()

        # 2) Re-insert with ID remapping
        cat_map: Dict[int, int] = {}
        prod_map: Dict[int, int] = {}
        cust_map: Dict[int, int] = {}
        sale_map: Dict[int, int] = {}
        pay_map: Dict[int, int] = {}

        # Categories
        for row in data.get("categories", []):
            old_id = row.get("id")
            payload = _filter_columns(models.Category, row)
            obj = models.Category(**payload)
            db.add(obj)
            db.flush()
            if old_id is not None:
                cat_map[int(old_id)] = obj.id

        # Products
        for row in data.get("products", []):
            old_id = row.get("id")
            payload = _filter_columns(models.Product, row)
            old_cat = payload.get("category_id")
            if old_cat is not None:
                payload["category_id"] = cat_map.get(int(old_cat))
            obj = models.Product(**payload)
            db.add(obj)
            db.flush()
            if old_id is not None:
                prod_map[int(old_id)] = obj.id

        # Customers
        for row in data.get("customers", []):
            old_id = row.get("id")
            payload = _filter_columns(models.Customer, row)
            obj = models.Customer(**payload)
            db.add(obj)
            db.flush()
            if old_id is not None:
                cust_map[int(old_id)] = obj.id

        # Sales (depend on customers)
        for row in data.get("sales", []):
            old_id = row.get("id")
            payload = _filter_columns(models.Sale, row)
            old_cust = payload.get("customer_id")
            if old_cust is not None:
                payload["customer_id"] = cust_map.get(int(old_cust))
            obj = models.Sale(**payload)
            db.add(obj)
            db.flush()
            if old_id is not None:
                sale_map[int(old_id)] = obj.id

        # Sale items (depend on sales + products)
        for row in data.get("sale_items", []):
            payload = _filter_columns(models.SaleItem, row)
            old_sale = payload.get("sale_id")
            old_prod = payload.get("product_id")
            new_sale = sale_map.get(int(old_sale)) if old_sale is not None else None
            new_prod = prod_map.get(int(old_prod)) if old_prod is not None else None
            if new_sale is None:
                continue  # orphaned line — skip rather than break the transaction
            payload["sale_id"] = new_sale
            payload["product_id"] = new_prod
            db.add(models.SaleItem(**payload))

        # Customer payments (depend on customers)
        for row in data.get("customer_payments", []):
            old_id = row.get("id")
            payload = _filter_columns(models.CustomerPayment, row)
            old_cust = payload.get("customer_id")
            if old_cust is None:
                continue
            new_cust = cust_map.get(int(old_cust))
            if new_cust is None:
                continue
            payload["customer_id"] = new_cust
            obj = models.CustomerPayment(**payload)
            db.add(obj)
            db.flush()
            if old_id is not None:
                pay_map[int(old_id)] = obj.id

        # Allocations (depend on payments + sales)
        for row in data.get("customer_payment_allocations", []):
            payload = _filter_columns(models.CustomerPaymentAllocation, row)
            old_pay = payload.get("payment_id")
            old_sale = payload.get("sale_id")
            new_pay = pay_map.get(int(old_pay)) if old_pay is not None else None
            new_sale = sale_map.get(int(old_sale)) if old_sale is not None else None
            if new_pay is None or new_sale is None:
                continue
            payload["payment_id"] = new_pay
            payload["sale_id"] = new_sale
            db.add(models.CustomerPaymentAllocation(**payload))

        # Stock movements (depend on products)
        for row in data.get("stock_movements", []):
            payload = _filter_columns(models.StockMovement, row)
            old_prod = payload.get("product_id")
            new_prod = prod_map.get(int(old_prod)) if old_prod is not None else None
            if new_prod is None:
                continue
            payload["product_id"] = new_prod
            db.add(models.StockMovement(**payload))

        # Store profile (single row)
        sp_rows = data.get("store_profile", [])
        if sp_rows:
            payload = _filter_columns(models.StoreProfile, sp_rows[0])
            db.add(models.StoreProfile(**payload))
        else:
            db.add(models.StoreProfile(onboarding_completed=False))

        # Reset sequences (PG only — best effort)
        try:
            dialect = db.bind.dialect.name if db.bind is not None else ""
            if dialect == "postgresql":
                with db.begin_nested():
                    for t in (
                        "sale_items",
                        "sales",
                        "customer_payment_allocations",
                        "customer_payments",
                        "customers",
                        "stock_movements",
                        "products",
                        "categories",
                        "store_profile",
                    ):
                        db.execute(_sql_text(
                            f'SELECT setval(pg_get_serial_sequence(\'"{t}"\', \'id\'), '
                            f'COALESCE((SELECT MAX(id) FROM "{t}"), 1))'
                        ))
        except Exception:
            pass

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"فشل استعادة النسخة الاحتياطية: {e}",
        )

    return _summarize(snapshot)


# ─────────────────────────────────────────────────────────────────────────────
# Auto-backup helpers (also used by main.py and admin.py)
# ─────────────────────────────────────────────────────────────────────────────

def write_auto_backup(tag: Optional[str] = None) -> Optional[Path]:
    """Write a fresh auto-backup file and prune to AUTO_BACKUP_KEEP files.

    Safe to call from sync code; opens its own DB session. Returns the file
    path on success, ``None`` on failure (logged, never raises).
    """
    db = SessionLocal()
    try:
        snapshot = _build_snapshot(db, tag=tag)
    except Exception as e:  # pragma: no cover
        print(f"[auto-backup] snapshot build failed: {e}")
        db.close()
        return None
    finally:
        db.close()

    backup_dir = _resolve_backup_dir()
    stamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    suffix = f"_{tag}" if tag else ""
    filename = f"{AUTO_BACKUP_PREFIX}{stamp}{suffix}.json"
    path = backup_dir / filename

    try:
        with path.open("w", encoding="utf-8") as f:
            json.dump(snapshot, f, ensure_ascii=False, separators=(",", ":"), default=str)
    except Exception as e:  # pragma: no cover
        print(f"[auto-backup] write failed: {e}")
        return None

    _prune_auto_backups(backup_dir)
    return path


def _prune_auto_backups(backup_dir: Path) -> None:
    files = sorted(
        [p for p in backup_dir.glob(f"{AUTO_BACKUP_PREFIX}*.json") if p.is_file()],
        key=lambda p: p.name,
        reverse=True,
    )
    for old in files[AUTO_BACKUP_KEEP:]:
        try:
            old.unlink()
        except Exception:  # pragma: no cover
            pass


def _safe_resolve(filename: str) -> Path:
    """Validate filename and return its absolute path inside the backup dir."""
    if not AUTO_BACKUP_FILENAME_RE.match(filename):
        raise HTTPException(status_code=400, detail="اسم ملف النسخة غير صالح.")
    backup_dir = _resolve_backup_dir()
    candidate = (backup_dir / filename).resolve()
    if backup_dir.resolve() not in candidate.parents and candidate.parent != backup_dir.resolve():
        raise HTTPException(status_code=400, detail="مسار غير صالح.")
    if not candidate.exists() or not candidate.is_file():
        raise HTTPException(status_code=404, detail="لم يتم العثور على ملف النسخة.")
    return candidate


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/export")
def export_data(db: Session = Depends(get_db)):
    try:
        return _build_snapshot(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"تعذر إنشاء النسخة الاحتياطية: {e}")


@router.post("/preview")
async def preview_backup(file: UploadFile = File(...)):
    """Validate the uploaded file and return its row counts without touching the DB."""
    try:
        raw = await file.read()
        snapshot = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="الملف ليس JSON صالحاً.")
    snapshot = _validate_snapshot(snapshot)
    return {
        "version": snapshot["meta"].get("version"),
        "date": snapshot["meta"].get("date"),
        "tag": snapshot["meta"].get("tag"),
        "counts": _summarize(snapshot),
    }


@router.post("/import")
async def import_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        raw = await file.read()
        snapshot = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="الملف ليس JSON صالحاً.")
    snapshot = _validate_snapshot(snapshot)
    # Pre-restore safety snapshot
    write_auto_backup(tag="pre-restore")
    counts = _restore_snapshot(db, snapshot)
    return {
        "success": True,
        "message": "تمت استعادة النسخة الاحتياطية بنجاح.",
        "counts": counts,
    }


@router.get("/auto-list")
def list_auto_backups():
    backup_dir = _resolve_backup_dir()
    items: List[Dict[str, Any]] = []
    for p in sorted(
        backup_dir.glob(f"{AUTO_BACKUP_PREFIX}*.json"),
        key=lambda p: p.name,
        reverse=True,
    ):
        if not p.is_file():
            continue
        try:
            stat = p.stat()
        except OSError:
            continue
        # Extract tag from filename (anything after the timestamp segment)
        m = re.match(
            r"^hanouti_auto_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})(?:_([a-zA-Z0-9\-]+))?\.json$",
            p.name,
        )
        date_str = None
        tag: Optional[str] = None
        if m:
            date_str = f"{m.group(1)} {m.group(2).replace('-', ':')}"
            tag = m.group(3)
        items.append({
            "filename": p.name,
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "date": date_str,
            "tag": tag,
        })
    return {"items": items, "kept": AUTO_BACKUP_KEEP, "directory": str(backup_dir)}


@router.get("/auto-download/{filename}")
def download_auto_backup(filename: str):
    path = _safe_resolve(filename)
    return FileResponse(
        path,
        media_type="application/json",
        filename=filename,
    )


@router.post("/auto-restore/{filename}")
def restore_auto_backup(filename: str, db: Session = Depends(get_db)):
    path = _safe_resolve(filename)
    try:
        with path.open("r", encoding="utf-8") as f:
            snapshot = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=400, detail=f"تعذّر قراءة ملف النسخة: {e}")
    snapshot = _validate_snapshot(snapshot)
    write_auto_backup(tag="pre-restore")
    counts = _restore_snapshot(db, snapshot)
    return {
        "success": True,
        "message": "تمت استعادة النسخة الاحتياطية بنجاح.",
        "counts": counts,
    }


@router.post("/auto-snapshot")
def trigger_auto_snapshot():
    """Manual trigger — also exposed so the frontend can take an immediate snapshot."""
    path = write_auto_backup(tag="manual")
    if path is None:
        raise HTTPException(status_code=500, detail="تعذّر إنشاء نسخة احتياطية.")
    return JSONResponse({"success": True, "filename": path.name})
