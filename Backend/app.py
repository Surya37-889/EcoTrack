import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
import db_manager
import carbon_service
import ai_service

app = Flask(__name__)
# Enable CORS for communication with Vite frontend on port 5173
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "time": datetime.datetime.now().isoformat()})

@app.route("/api/auth/login", methods=["POST"])
def login():
    """
    Mock authentication login endpoint.
    If using real Firebase Auth, the client logs in directly and passes the token.
    For college-project convenience, we support a simple profile identifier.
    """
    data = request.get_json() or {}
    email = data.get("email", "guest@ecotrack.org")
    user_id = email.replace(".", "_").replace("@", "_")
    return jsonify({
        "status": "success",
        "user": {
            "uid": user_id,
            "email": email,
            "displayName": email.split("@")[0].capitalize()
        }
    })

@app.route("/api/logs", methods=["POST"])
def add_log():
    """
    Computes emissions based on parameters, saves the entry, and returns results.
    """
    data = request.get_json() or {}
    user_id = data.get("userId", "default_user")
    category = data.get("category")
    details = data.get("details", {})
    timestamp = data.get("timestamp") or datetime.datetime.now().isoformat()
    
    if not category or not isinstance(details, dict):
        return jsonify({"error": "Invalid payload parameters"}), 400
        
    # Calculate emissions
    emissions = 0.0
    if category == "travel":
        transport_type = details.get("transport_type", "car")
        distance_km = details.get("distance_km", 0)
        passengers = details.get("passengers", 0)
        emissions = carbon_service.calculate_travel_emissions(transport_type, distance_km, passengers)
    elif category == "food":
        diet_type = details.get("diet_type", "vegetarian")
        food_waste = details.get("food_waste", False)
        emissions = carbon_service.calculate_food_emissions(diet_type, food_waste)
    else:
        return jsonify({"error": "Unknown log category"}), 400
        
    # Save log to database
    success = db_manager.save_log(user_id, category, details, emissions, timestamp)
    if success:
        return jsonify({
            "status": "success",
            "log": {
                "category": category,
                "emissions": emissions,
                "timestamp": timestamp,
                "details": details
            }
        }), 201
    else:
        return jsonify({"error": "Failed to store record"}), 500

@app.route("/api/logs", methods=["GET"])
def get_logs():
    """
    Fetches the last 30 days of logs for a user.
    """
    user_id = request.args.get("userId", "default_user")
    days = int(request.args.get("days", 30))
    logs = db_manager.get_logs(user_id, days)
    return jsonify(logs)

@app.route("/api/logs/<log_id>", methods=["DELETE"])
def remove_log(log_id):
    """
    Deletes an entry by its ID.
    """
    user_id = request.args.get("userId", "default_user")
    success = db_manager.delete_log(user_id, log_id)
    if success:
        return jsonify({"status": "success"})
    return jsonify({"error": "Failed to delete log entry"}), 500

@app.route("/api/suggestions", methods=["GET"])
def suggestions():
    """
    Generates AI suggestions based on recent history logs.
    """
    user_id = request.args.get("userId", "default_user")
    logs = db_manager.get_logs(user_id, 30)
    recommendations = ai_service.get_eco_suggestions(logs)
    return jsonify({"recommendations": recommendations})

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """
    Aggregates metrics for dashboard charts.
    """
    user_id = request.args.get("userId", "default_user")
    
    # Retrieve logs for the last 30 days
    logs = db_manager.get_logs(user_id, 30)
    
    # Set up date ranges
    today_str = datetime.date.today().isoformat()
    
    # 1. Calculate today's emissions
    today_emissions = sum(log["emissions"] for log in logs if log["timestamp"].startswith(today_str))
    
    # 2. Generate 30-day timeline (line chart data)
    # 3. Generate 14-day stacked bar data
    # 4. Generate heatmap data
    
    thirty_days_ago = datetime.date.today() - datetime.timedelta(days=29)
    date_list_30 = [thirty_days_ago + datetime.timedelta(days=i) for i in range(30)]
    date_strings_30 = [d.isoformat() for d in date_list_30]
    
    # Group emissions by date and category
    daily_emissions_line = {d: 0.0 for d in date_strings_30}
    daily_travel = {d: 0.0 for d in date_strings_30}
    daily_food = {d: 0.0 for d in date_strings_30}
    
    for log in logs:
        log_date = log["timestamp"][:10]
        if log_date in daily_emissions_line:
            daily_emissions_line[log_date] += log["emissions"]
            if log["category"] == "travel":
                daily_travel[log_date] += log["emissions"]
            elif log["category"] == "food":
                daily_food[log_date] += log["emissions"]
                
    # 30-day list for output
    line_labels = [d[5:] for d in date_strings_30] # MM-DD format for labels
    line_values = [round(daily_emissions_line[d], 2) for d in date_strings_30]
    
    # 14-day subset for stacked category bar chart
    fourteen_days_ago = datetime.date.today() - datetime.timedelta(days=13)
    date_list_14 = [fourteen_days_ago + datetime.timedelta(days=i) for i in range(14)]
    date_strings_14 = [d.isoformat() for d in date_list_14]
    
    bar_labels = [d[5:] for d in date_strings_14]
    bar_travel = [round(daily_travel[d], 2) for d in date_strings_14]
    bar_food = [round(daily_food[d], 2) for d in date_strings_14]
    
    # Heatmap calendar format (returns full date string keys)
    heatmap_data = {d: round(daily_emissions_line[d], 2) for d in date_strings_30}
    
    # 5. Summary statistics
    all_values = [v for v in daily_emissions_line.values() if v > 0]
    
    total_30_days = sum(daily_emissions_line.values())
    seven_day_sum = sum(daily_emissions_line[d.isoformat()] for d in [datetime.date.today() - datetime.timedelta(days=i) for i in range(7)])
    avg_7_days = seven_day_sum / 7.0
    
    best_day_value = min(all_values) if all_values else 0.0
    best_days = [d for d, v in daily_emissions_line.items() if abs(v - best_day_value) < 0.01]
    best_day = best_days[0] if best_days else today_str
    
    worst_day_value = max(daily_emissions_line.values()) if daily_emissions_line else 0.0
    worst_days = [d for d, v in daily_emissions_line.items() if abs(v - worst_day_value) < 0.01]
    worst_day = worst_days[0] if worst_days else today_str
    
    return jsonify({
        "budget": Config.DAILY_CARBON_BUDGET,
        "today_emissions": round(today_emissions, 2),
        "history_30_days": {
            "labels": line_labels,
            "emissions": line_values,
            "budget_line": [Config.DAILY_CARBON_BUDGET] * 30
        },
        "breakdown_14_days": {
            "labels": bar_labels,
            "travel": bar_travel,
            "food": bar_food
        },
        "heatmap": heatmap_data,
        "summary": {
            "total_30_days": round(total_30_days, 2),
            "average_7_days": round(avg_7_days, 2),
            "best_day": {"date": best_day, "value": round(best_day_value, 2)},
            "worst_day": {"date": worst_day, "value": round(worst_day_value, 2)}
        }
    })

if __name__ == "__main__":
    print("=" * 50)
    print("Starting EcoTrack Backend...")
    print("Server URL: http://127.0.0.1:5000")
    print("=" * 50)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        use_reloader=False
    )