from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import models, database, crud, schemas
from routers import auth, products, categories, sales, inventory, reports, backup

models.Base.metadata.create_all(bind=database.engine)


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


@app.get("/")
def read_root():
    return {"message": "Welcome to Hanouti API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
