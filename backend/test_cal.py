import os
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.user import User
from app.api.v1.calendar import get_hr_calendar

def main():
    db = SessionLocal()
    user = db.query(User).filter(User.email == 'employee1@example.com').first()
    if not user:
        user = db.query(User).first()
    
    try:
        res = get_hr_calendar(None, None, None, None, None, None, None, db, user)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
