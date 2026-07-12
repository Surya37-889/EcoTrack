import requests
from config import Config

# Standard EPA / Carbon Interface base coefficients (in kg CO2e per km)
TRAVEL_COEFFICIENTS = {
    "car": 0.18,          # Average gasoline passenger car
    "ev": 0.05,           # Electric vehicle (based on average grid mix)
    "transit": 0.08,      # Bus or light rail public transport average
    "motorcycle": 0.11,   # Average motorcycle
    "walking": 0.0,       # Walking
    "bike": 0.0           # Cycling
}

# Diet carbon footprints per meal (in kg CO2e, based on standard diet lifecycle analysis)
DIET_COEFFICIENTS = {
    "vegan": 0.5,         # Plant-based
    "vegetarian": 0.7,    # No meat, includes dairy/eggs
    "pescatarian": 0.9,   # Includes seafood
    "low_meat": 1.1,      # Occasional meat consumer
    "high_meat": 1.7      # High beef/pork consumption
}

def calculate_travel_emissions(transport_type, distance_km, passengers=0):
    """
    Computes emissions for a travel log.
    If Carbon Interface API key is set, attempts to use their API for estimates.
    Otherwise, uses standard EPA factors with passenger splitting.
    """
    distance_km = float(distance_km)
    passengers = int(passengers)
    total_passengers = passengers + 1 # Driver + passengers
    
    # Try Carbon Interface API first if configured and it's a vehicle type
    if Config.CARBON_INTERFACE_API_KEY and transport_type in ["car", "ev", "motorcycle"]:
        try:
            # Using Carbon Interface Estimates API
            # For testing, we use standard passenger car estimate parameters
            headers = {
                "Authorization": f"Bearer {Config.CARBON_INTERFACE_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "type": "vehicle",
                "distance_unit": "km",
                "distance_value": distance_km,
                # Carbon Interface requires a vehicle model ID. We use a standard mid-size car model
                "vehicle_model_id": "7268a9b7-17e8-4c8d-adab-0a581474d320" if transport_type != "ev" else "e81d77a2-f8c5-4927-a068-0fb53b21699f"
            }
            
            response = requests.post(
                "https://www.carboninterface.com/api/v1/estimates",
                json=payload,
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 201:
                data = response.json()
                total_co2_kg = data["data"]["attributes"]["carbon_kg"]
                # Share emissions among carpool passengers
                return total_co2_kg / total_passengers
        except Exception as e:
            print(f"Carbon Interface API request failed: {e}. Using local calculations.")
            
    # Fallback to local calculations
    factor = TRAVEL_COEFFICIENTS.get(transport_type.lower(), 0.18)
    total_emissions = distance_km * factor
    
    # Division of footprint for carpoolers
    if transport_type.lower() in ["car", "ev", "motorcycle"] and total_passengers > 1:
        return total_emissions / total_passengers
        
    return total_emissions

def calculate_food_emissions(diet_type, food_waste=False):
    """
    Computes emissions for a food log.
    Includes a 10% penalty for food waste.
    """
    base_emissions = DIET_COEFFICIENTS.get(diet_type.lower(), 1.0)
    
    if food_waste:
        # 10% food waste penalty
        return base_emissions * 1.10
        
    return base_emissions
