"""Runtime-tunable application settings (auto-backup schedule, etc.).

Kept as a small dedicated router so the contract is explicit and so we can
audit every change. Each setter logs an ``activity_service`` entry recording
the old → new value transition.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from services import activity_service, app_settings_service as cfg

router = APIRouter(prefix="/settings", tags=["settings"])


class AutoBackupConfig(BaseModel):
    interval_minutes: int = Field(
        default=cfg.DEFAULT_AUTO_BACKUP_INTERVAL_MIN,
        ge=cfg.MIN_AUTO_BACKUP_INTERVAL_MIN,
        le=cfg.MAX_AUTO_BACKUP_INTERVAL_MIN,
    )
    enabled: bool = True


@router.get("/auto-backup", response_model=AutoBackupConfig)
def get_auto_backup_config(db: Session = Depends(get_db)) -> AutoBackupConfig:
    return AutoBackupConfig(
        interval_minutes=cfg.get_int(
            db,
            cfg.KEY_AUTO_BACKUP_INTERVAL_MIN,
            cfg.DEFAULT_AUTO_BACKUP_INTERVAL_MIN,
        ),
        enabled=cfg.get_bool(db, cfg.KEY_AUTO_BACKUP_ENABLED, True),
    )


@router.put("/auto-backup", response_model=AutoBackupConfig)
def set_auto_backup_config(
    body: AutoBackupConfig,
    db: Session = Depends(get_db),
) -> AutoBackupConfig:
    if not (
        cfg.MIN_AUTO_BACKUP_INTERVAL_MIN
        <= body.interval_minutes
        <= cfg.MAX_AUTO_BACKUP_INTERVAL_MIN
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"المدة يجب أن تكون بين "
                f"{cfg.MIN_AUTO_BACKUP_INTERVAL_MIN} دقيقة "
                f"و {cfg.MAX_AUTO_BACKUP_INTERVAL_MIN} دقيقة."
            ),
        )

    prev_interval = cfg.get_int(
        db,
        cfg.KEY_AUTO_BACKUP_INTERVAL_MIN,
        cfg.DEFAULT_AUTO_BACKUP_INTERVAL_MIN,
    )
    prev_enabled = cfg.get_bool(db, cfg.KEY_AUTO_BACKUP_ENABLED, True)

    cfg.set_value(db, cfg.KEY_AUTO_BACKUP_INTERVAL_MIN, int(body.interval_minutes))
    cfg.set_value(db, cfg.KEY_AUTO_BACKUP_ENABLED, bool(body.enabled))

    activity_service.log(
        None,
        action="settings.auto_backup.updated",
        summary=(
            f"تحديث جدولة النسخ التلقائية: كل {body.interval_minutes} دقيقة "
            f"({'مفعّلة' if body.enabled else 'موقوفة'})"
        ),
        severity=activity_service.SEVERITY_INFO,
        meta={
            "previous": {"interval_minutes": prev_interval, "enabled": prev_enabled},
            "current": {
                "interval_minutes": int(body.interval_minutes),
                "enabled": bool(body.enabled),
            },
        },
    )
    return body
