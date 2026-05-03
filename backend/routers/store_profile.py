import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, schemas, database

router = APIRouter(prefix="/store-profile", tags=["store-profile"])


def _serialize(profile: models.StoreProfile) -> dict:
    features = profile.features_needed or ""
    features_list = [f.strip() for f in features.split(",") if f.strip()] if features else []
    return {
        "id": profile.id,
        "store_name": profile.store_name,
        "business_type": profile.business_type,
        "staff_count": profile.staff_count,
        "features_needed": features_list,
        "onboarding_completed": bool(profile.onboarding_completed),
    }


def _get_or_create(db: Session) -> models.StoreProfile:
    profile = db.query(models.StoreProfile).order_by(models.StoreProfile.id.asc()).first()
    if not profile:
        profile = models.StoreProfile(onboarding_completed=False)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/", response_model=schemas.StoreProfile)
def get_store_profile(db: Session = Depends(database.get_db)):
    profile = _get_or_create(db)
    return _serialize(profile)


@router.put("/", response_model=schemas.StoreProfile)
def update_store_profile(
    payload: schemas.StoreProfileUpdate,
    db: Session = Depends(database.get_db),
):
    profile = _get_or_create(db)
    data = payload.model_dump(exclude_unset=True)

    if "features_needed" in data:
        feats = data.pop("features_needed")
        profile.features_needed = ",".join(feats) if feats else ""

    for key, value in data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return _serialize(profile)
