import json
import requests
from config import Config

def generate_local_suggestions(logs):
    """
    Generates rule-based suggestions based on the user's recent log history.
    Used when GROQ_API_KEY is not configured.
    """
    # Default recommendations
    suggestions = [
        {
            "title": "Switch to Meatless Mondays",
            "action": "Swap beef or pork meals for delicious plant-based alternatives like lentil curry or tofu stir-fry.",
            "co2_saving": 4.5,
            "impact": "High"
        },
        {
            "title": "Unify Transit Errands",
            "action": "Plan ahead to combine multiple short car trips into a single route or walk for errands under 2 km.",
            "co2_saving": 2.8,
            "impact": "Medium"
        },
        {
            "title": "Reduce Kitchen Waste",
            "action": "Create a weekly meal plan, freeze leftovers immediately, and buy only what is on your grocery list.",
            "co2_saving": 1.5,
            "impact": "Low"
        }
    ]
    
    # Custom adjustments based on logs
    has_car = False
    has_meat = False
    has_waste = False
    
    for log in logs:
        details = log.get("details", {})
        category = log.get("category", "")
        
        if category == "travel":
            t_type = details.get("transport_type", "")
            if t_type == "car" and float(details.get("distance_km", 0)) > 15:
                has_car = True
        elif category == "food":
            diet = details.get("diet_type", "")
            if diet in ["high_meat", "low_meat"]:
                has_meat = True
            if details.get("food_waste", False):
                has_waste = True
                
    # Modify default list based on behaviors detected
    updated_suggestions = []
    
    if has_car:
        updated_suggestions.append({
            "title": "Carpool or EV Share",
            "action": "Since you commute solo by car, try carpooling with coworkers or utilizing local electric transit options.",
            "co2_saving": 6.2,
            "impact": "High"
        })
    else:
        updated_suggestions.append(suggestions[0]) # Add default meatless monday
        
    if has_waste:
        updated_suggestions.append({
            "title": "Save Food, Save Energy",
            "action": "You logged a meal with food waste. Try compost planning or a 'use-first' shelf in your fridge to avoid the 10% penalty.",
            "co2_saving": 2.1,
            "impact": "Medium"
        })
    else:
        updated_suggestions.append(suggestions[1]) # Add default transit consolidation
        
    if has_meat:
        updated_suggestions.append({
            "title": "Introduce Plant Proteins",
            "action": "Switch one high-impact meat meal to a bean- or pea-protein based lunch to reduce agricultural emissions.",
            "co2_saving": 3.8,
            "impact": "Medium"
        })
    else:
        updated_suggestions.append(suggestions[2]) # Add default kitchen waste
        
    return updated_suggestions[:3]

def get_eco_suggestions(logs):
    """
    Sends recent logs to Groq API to generate 3 custom recommendation cards.
    If API key is missing or request fails, falls back to rule-based engine.
    """
    if not Config.GROQ_API_KEY:
        print("Groq API Key not found. Generating rule-based suggestions.")
        return generate_local_suggestions(logs)
        
    # Format recent logs for the LLM prompt
    formatted_logs = []
    for log in logs:
        details = log.get("details", {})
        formatted_logs.append({
            "category": log.get("category"),
            "emissions_kg_co2": log.get("emissions"),
            "details": details,
            "date": log.get("timestamp")[:10] if log.get("timestamp") else "N/A"
        })
        
    prompt = f"""
    You are an eco-sustainability AI assistant. Analyze these carbon footprint logs from a user:
    {json.dumps(formatted_logs[-15:])}
    
    Based on their habits (e.g. types of transportation used, food diets logged, waste recorded), generate exactly three custom sustainability recommendation cards.
    Each card MUST suggest a specific, actionable lifestyle swap that reduces emissions, including a title, detailed description (the 'action'), the estimated carbon savings in kg CO2e per week or per activity, and a subjective impact category ('High', 'Medium', or 'Low').
    
    Return your response strictly as a JSON object with a single root key "recommendations" containing an array of exactly 3 recommendation objects.
    JSON Format:
    {{
      "recommendations": [
        {{
          "title": "Recommendation Title",
          "action": "Description of the specific swap or action",
          "co2_saving": 3.5,
          "impact": "Medium"
        }}
      ]
    }}
    """
    
    try:
        headers = {
            "Authorization": f"Bearer {Config.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {
                    "role": "system", 
                    "content": "You are a professional environmental consultant that outputs structured JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3
        }
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=8
        )
        
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"]
            result = json.loads(content)
            if "recommendations" in result and len(result["recommendations"]) >= 3:
                return result["recommendations"][:3]
                
    except Exception as e:
        print(f"Error calling Groq API: {e}. Falling back to rule-based suggestions.")
        
    return generate_local_suggestions(logs)
