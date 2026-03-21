from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, database, crud, schemas
from .routers import auth, products, categories, sales, inventory, reports, backup

# Create tables (simple way for now, Alembic later)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Hanouti API", version="1.0.0")

# Include Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(sales.router)
app.include_router(inventory.router)
app.include_router(reports.router)
app.include_router(backup.router)


# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    db = database.SessionLocal()
    try:
        user = crud.get_user_by_username(db, "admin")
        if not user:
            admin_user = schemas.UserCreate(username="admin", password="1234")
            crud.create_user(db, admin_user)
            print("Created default admin user with password: 1234")
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to Hanouti API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
