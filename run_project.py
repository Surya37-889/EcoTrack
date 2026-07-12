import os
import sys
import json
import sqlite3
import datetime
import random

# Root directories
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

def setup_env_file():
    env_path = os.path.join(BACKEND_DIR, ".env")
    if not os.path.exists(env_path):
        with open(env_path, "w") as f:
            f.write("""# EcoTrack Configuration

# Port for the Flask backend
PORT=5000
FLASK_ENV=development

# Groq Cloud API (llama-3.3-70b-versatile)
# Get a free key at: https://console.groq.com/
GROQ_API_KEY=

# Carbon Interface API
# Get a free key at: https://www.carboninterface.com/
CARBON_INTERFACE_API_KEY=

# Firebase Admin Service Account JSON Path
# Leave empty to run in SQLite mock mode automatically
FIREBASE_CREDENTIALS_PATH=

# Daily Target Carbon Budget in kg CO2e
DAILY_CARBON_BUDGET=10.0
""")
        print(f"Created template .env configuration at {env_path}")
    else:
        print(".env configuration file already exists.")

def seed_sample_data():
    db_path = os.path.join(BACKEND_DIR, "ecotrack.db")
    
    # Check if database is already populated
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM logs")
        count = c.fetchone()[0]
        conn.close()
        if count > 0:
            print("Database already contains logs. Skipping data seeding.")
            return

    print("Initializing local SQLite database with 30 days of rich sample logs for visualization...")
    
    # Initialize DB schema
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            category TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            emissions REAL NOT NULL,
            details TEXT NOT NULL
        )
    """)
    
    # Standard diet/travel options for generator
    diets = ["vegan", "vegetarian", "pescatarian", "low_meat", "high_meat"]
    transports = ["car", "ev", "transit", "motorcycle", "bike", "walking"]
    
    user_id = "guest_ecotrack_org"
    today = datetime.date.today()
    
    # Insert logs for the last 30 days
    for i in range(29, -1, -1):
        log_date = today - datetime.timedelta(days=i)
        
        # 1. Travel logs
        if random.random() < 0.85:  # Commuted on most days
            t_type = random.choices(transports, weights=[0.4, 0.15, 0.25, 0.05, 0.1, 0.05])[0]
            distance = round(random.uniform(5.0, 35.0), 1)
            passengers = random.randint(0, 2) if t_type in ["car", "ev"] else 0
            
            # Emissions math
            factor = {"car": 0.18, "ev": 0.05, "transit": 0.08, "motorcycle": 0.11, "bike": 0.0, "walking": 0.0}[t_type]
            emissions = distance * factor
            if t_type in ["car", "ev"] and passengers > 0:
                emissions = emissions / (passengers + 1)
                
            details = {
                "distance_km": distance,
                "transport_type": t_type,
                "passengers": passengers
            }
            
            # Random time
            timestamp = datetime.datetime.combine(log_date, datetime.time(random.randint(7, 9), random.randint(0, 59))).isoformat()
            
            c.execute(
                "INSERT INTO logs (user_id, category, timestamp, emissions, details) VALUES (?, ?, ?, ?, ?)",
                (user_id, "travel", timestamp, round(emissions, 2), json.dumps(details))
            )
            
        # 2. Food logs (multiple meals on some days, or full day logs)
        diet = random.choices(diets, weights=[0.1, 0.3, 0.2, 0.3, 0.1])[0]
        waste = random.random() < 0.2  # 20% waste probability
        
        base_emissions = {"vegan": 0.5, "vegetarian": 0.7, "pescatarian": 0.9, "low_meat": 1.1, "high_meat": 1.7}[diet]
        emissions = base_emissions * (1.10 if waste else 1.0)
        
        details = {
            "diet_type": diet,
            "food_waste": waste
        }
        
        timestamp = datetime.datetime.combine(log_date, datetime.time(random.randint(12, 19), random.randint(0, 59))).isoformat()
        c.execute(
            "INSERT INTO logs (user_id, category, timestamp, emissions, details) VALUES (?, ?, ?, ?, ?)",
            (user_id, "food", timestamp, round(emissions, 2), json.dumps(details))
        )
        
    conn.commit()
    conn.close()
    print("Database seeding completed successfully.")

def print_instructions():
    print("""
========================================================================
🌱 EcoTrack Project successfully configured! 🌱
========================================================================

Follow these steps to run the application:

1. Start the Flask Backend:
   $ cd backend
   $ python app.py
   (Backend runs on http://localhost:5000)

2. Configure API Keys:
   Edit the file: backend/.env
   Add your GROQ_API_KEY for Llama AI Eco-Suggestions, or leave it blank
   to run the local rule-based system automatically.

3. Run the React Frontend:
   (Ensure Node.js and npm are installed on your system)
   $ cd frontend
   $ npm install
   $ npm run dev
   (Frontend runs on http://localhost:5173 with proxy configuration)

4. Test User Profile:
   On the login page, use: "guest@ecotrack.org" to load the seeded log data.
========================================================================
""")

if __name__ == "__main__":
    setup_env_file()
    seed_sample_data()
    print_instructions()
