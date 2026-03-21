import sys
import os

# Add the parent directory so 'backend.module' imports work at runtime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal  # type: ignore
from backend.crud import get_user_by_username  # type: ignore
from backend.security import get_password_hash, verify_password  # type: ignore

def main():
    db = SessionLocal()
    try:
        user = get_user_by_username(db, "admin")
        if not user:
            print("لم يتم العثور على حساب 'admin'.")
            return
        
        current_hash = user.hashed_password
        
        # Check if current password is '1234'
        is_default = False
        try:
            is_default = verify_password("1234", current_hash)
        except Exception as e:
            print(f"Error verifying password: {e}")
            
        print(f"[تحقق]: هل كلمة المرور الحالية هي الافتراضية (1234)؟ {'نعم' if is_default else 'لا'}")
        
        if not is_default:
            # Restore to default
            print("[إجراء]: جاري إعادة ضبط كلمة المرور إلى 1234...")
            user.hashed_password = get_password_hash("1234")
            db.commit()
            print("[نجاح]: تم إرجاع كلمة المرور للوضع الافتراضي (1234).")
        else:
            print("[تنبيه]: كلمة المرور هي بالفعل الكلمة الافتراضية (1234).")
            
    finally:
        db.close()

if __name__ == "__main__":
    main()
