import os
from dotenv import load_dotenv

# Load environment variables from a .env file if present
load_dotenv()

class Config:
    PORT = int(os.environ.get("PORT", 5000))
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")
    
    # API Keys
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    CARBON_INTERFACE_API_KEY = os.environ.get("CARBON_INTERFACE_API_KEY", "")
    
    # Firebase settings
    FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH", "")
    
    # Daily carbon budget target in kg CO2e
    DAILY_CARBON_BUDGET = float(os.environ.get("DAILY_CARBON_BUDGET", 10.0))
