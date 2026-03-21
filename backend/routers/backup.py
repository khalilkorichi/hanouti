from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..db.session import get_db
from .. import models
import json
from datetime import datetime

router = APIRouter(prefix="/backup", tags=["backup"])

def serialize_model(instance):
    """Helper to serialize SQLAlchemy model instance to dict"""
    data = {}
    for key, value in instance.__dict__.items():
        if key.startswith('_sa_'):
            continue
        if isinstance(value, datetime):
            data[key] = value.isoformat()
        else:
            data[key] = value
    return data

@router.get("/export")
def export_data(db: Session = Depends(get_db)):
    try:
        # Fetch all data
        categories = db.query(models.Category).all()
        products = db.query(models.Product).all()
        customers = db.query(models.Customer).all()
        sales = db.query(models.Sale).all()
        sale_items = db.query(models.SaleItem).all()
        stock_movements = db.query(models.StockMovement).all()

        data = {
            "meta": {
                "version": "1.0",
                "date": datetime.now().isoformat(),
                "app": "Hanouti"
            },
            "data": {
                "categories": [serialize_model(c) for c in categories],
                "products": [serialize_model(p) for p in products],
                "customers": [serialize_model(c) for c in customers],
                "sales": [serialize_model(s) for s in sales],
                "sale_items": [serialize_model(si) for si in sale_items],
                "stock_movements": [serialize_model(sm) for sm in stock_movements]
            }
        }
        
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/import")
async def import_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        backup_data = json.loads(content)
        
        # Basic validation
        if "meta" not in backup_data or "data" not in backup_data:
            raise HTTPException(status_code=400, detail="Invalid backup file format")

        # TODO: Implement actual import logic
        # This requires careful handling of IDs and Foreign Keys to avoid conflicts.
        # For Phase 08, we provide the endpoint structure.
        
        return {
            "message": "Backup file validated successfully", 
            "details": f"Contains {len(backup_data['data'].get('products', []))} products, {len(backup_data['data'].get('sales', []))} sales."
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
