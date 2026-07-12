import os
import sqlite3
import datetime
from config import Config

# Initialize Firebase if credentials exist
firebase_initialized = False
db = None

if Config.FIREBASE_CREDENTIALS_PATH and os.path.exists(Config.FIREBASE_CREDENTIALS_PATH):
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        cred = credentials.Certificate(Config.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        firebase_initialized = True
        print("Firebase Firestore initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}. Falling back to SQLite.")

# Setup local SQLite database as fallback
SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ecotrack.db")

def init_sqlite_db():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            category TEXT NOT NULL, -- 'travel' or 'food'
            timestamp TEXT NOT NULL,
            emissions REAL NOT NULL, -- in kg CO2e
            details TEXT NOT NULL -- JSON string of entry inputs
        )
    """)
    conn.commit()
    conn.close()

if not firebase_initialized:
    init_sqlite_db()
    print(f"SQLite database initialized at {SQLITE_DB_PATH}")

def save_log(user_id, category, details, emissions, timestamp=None):
    """
    Saves an emission log entry to either Firestore or local SQLite.
    """
    if not timestamp:
        timestamp = datetime.datetime.now().isoformat()
        
    import json
    details_str = json.dumps(details)
    
    if firebase_initialized and db:
        try:
            doc_ref = db.collection("users").document(user_id).collection("logs").document()
            doc_ref.set({
                "category": category,
                "timestamp": timestamp,
                "emissions": float(emissions),
                "details": details
            })
            return True
        except Exception as e:
            print(f"Failed to write to Firestore: {e}. Writing to SQLite fallback.")
            # Fall through to SQLite on failure
            
    # Local SQLite write
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO logs (user_id, category, timestamp, emissions, details) VALUES (?, ?, ?, ?, ?)",
            (user_id, category, timestamp, float(emissions), details_str)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Failed to write to SQLite: {e}")
        return False

def get_logs(user_id, days=30):
    """
    Retrieves logs for the specified user, filtered by the last N days.
    """
    cutoff_date = (datetime.datetime.now() - datetime.timedelta(days=days)).isoformat()
    
    if firebase_initialized and db:
        try:
            logs_ref = db.collection("users").document(user_id).collection("logs")
            query = logs_ref.where("timestamp", ">=", cutoff_date).order_by("timestamp", direction=firestore.Query.ASCENDING)
            docs = query.stream()
            
            results = []
            for doc in docs:
                data = doc.to_dict()
                results.append({
                    "id": doc.id,
                    "category": data.get("category"),
                    "timestamp": data.get("timestamp"),
                    "emissions": data.get("emissions"),
                    "details": data.get("details")
                })
            return results
        except Exception as e:
            print(f"Firestore query error: {e}. Falling back to SQLite.")
            
    # SQLite retrieval
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM logs WHERE user_id = ? AND timestamp >= ? ORDER BY timestamp ASC",
            (user_id, cutoff_date)
        )
        rows = cursor.fetchall()
        conn.close()
        
        import json
        results = []
        for row in rows:
            try:
                details = json.loads(row["details"])
            except:
                details = {}
            results.append({
                "id": row["id"],
                "category": row["category"],
                "timestamp": row["timestamp"],
                "emissions": row["emissions"],
                "details": details
            })
        return results
    except Exception as e:
        print(f"SQLite query error: {e}")
        return []

def delete_log(user_id, log_id):
    """
    Deletes a log entry.
    """
    if firebase_initialized and db:
        try:
            db.collection("users").document(user_id).collection("logs").document(log_id).delete()
            return True
        except Exception as e:
            print(f"Firestore delete error: {e}. Attempting SQLite deletion.")
            
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM logs WHERE user_id = ? AND id = ?", (user_id, log_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"SQLite delete error: {e}")
        return False
