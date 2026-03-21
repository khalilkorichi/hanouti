import sys
sys.path.insert(0, '.')

from database import SessionLocal, engine
from models import Base
import crud, schemas

# Create all tables
Base.metadata.create_all(bind=engine)
print("✅ Database tables created")

# Create admin user
db = SessionLocal()
try:
    user = crud.get_user_by_username(db, username="admin")
    if not user:
        admin_user = schemas.UserCreate(username="admin", password="123")
        crud.create_user(db, admin_user)
        print("✅ Admin user created (username: admin, password: 123)")
    else:
        print("ℹ️ Admin user already exists")
finally:
    db.close()

print("\n✅ Database setup complete!")
