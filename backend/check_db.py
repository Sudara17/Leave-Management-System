import sqlite3
import os

db_path = r'c:\Users\sudha\OneDrive\Attachments\Desktop\Leave management system\Enterprise-HRMS\backend\hrms.db'
if not os.path.exists(db_path):
    print("DB not found at", db_path)
else:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cur.fetchall()
    print("Tables:", [t[0] for t in tables])
