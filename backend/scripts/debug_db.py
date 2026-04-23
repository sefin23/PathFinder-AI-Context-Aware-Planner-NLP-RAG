
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'sql_app.db')

def check_columns():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA table_info(users)")
        cols = cursor.fetchall()
        print(f"Columns in 'users' table at {DB_PATH}:")
        for col in cols:
            print(f" - {col[1]} ({col[2]})")
    except Exception as e:
        print(f"Error checking users: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_columns()
