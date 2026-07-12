import React, { useState } from "react";
import { Plus, Navigation, Utensils, AlertTriangle, Check, Sparkles, RefreshCw, Trash2 } from "lucide-react";

function Dashboard({ user, stats, logs, suggestions, refreshData, loading }) {
  // Travel Log Form State
  const [distance, setDistance] = useState("");
  const [transportType, setTransportType] = useState("car");
  const [passengers, setPassengers] = useState("0");
  const [submittingTravel, setSubmittingTravel] = useState(false);
  const [travelSuccess, setTravelSuccess] = useState(false);

  // Food Log Form State
  const [dietType, setDietType] = useState("vegetarian");
  const [foodWaste, setFoodWaste] = useState(false);
  const [submittingFood, setSubmittingFood] = useState(false);
  const [foodSuccess, setFoodSuccess] = useState(false);

  // Today stats computation
  const budget = stats?.budget || 10.0;
  const todayEmissions = stats?.today_emissions || 0.0;
  const percentUsed = Math.min((todayEmissions / budget) * 100, 100);
  const isOverBudget = todayEmissions > budget;
  
  // Calculate SVG circular properties for gauge
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentUsed / 100) * circumference;

  const handleTravelSubmit = async (e) => {
    e.preventDefault();
    if (!distance || parseFloat(distance) <= 0) return;
    setSubmittingTravel(true);
    setTravelSuccess(false);
    
    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          category: "travel",
          details: {
            distance_km: parseFloat(distance),
            transport_type: transportType,
            passengers: parseInt(passengers)
          }
        })
      });
      if (response.ok) {
        setDistance("");
        setPassengers("0");
        setTravelSuccess(true);
        refreshData();
        setTimeout(() => setTravelSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingTravel(false);
    }
  };

  const handleFoodSubmit = async (e) => {
    e.preventDefault();
    setSubmittingFood(true);
    setFoodSuccess(false);
    
    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          category: "food",
          details: {
            diet_type: dietType,
            food_waste: foodWaste
          }
        })
      });
      if (response.ok) {
        setFoodSuccess(true);
        setFoodWaste(false);
        refreshData();
        setTimeout(() => setFoodSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFood(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Are you sure you want to delete this log entry?")) return;
    try {
      const response = await fetch(`/api/logs/${logId}?userId=${user.uid}`, {
        method: "DELETE"
      });
      if (response.ok) {
        refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      {/* Upper Grid: Gauge & Logging Forms */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        
        {/* Carbon Budget Gauge */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ position: "absolute", top: "16px", right: "16px" }}>
            <button 
              onClick={refreshData} 
              disabled={loading}
              style={{ background: "transparent", border: 0, color: "var(--text-dark)", cursor: "pointer" }}
              title="Refresh Stats"
            >
              <RefreshCw size={16} className={loading ? "pulse" : ""} />
            </button>
          </div>
          
          <h3 style={{ fontSize: "1.1rem", color: "var(--text-muted)", marginBottom: "16px", fontFamily: "var(--font-display)" }}>
            Daily Carbon Budget
          </h3>

          <div style={{ position: "relative", width: "200px", height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* SVG Circle Gauge */}
            <svg width="200" height="200" style={{ transform: "rotate(-90deg)" }}>
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="12"
              />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke={isOverBudget ? "var(--danger)" : "var(--primary)"}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
              />
            </svg>
            
            <div style={{ position: "absolute", textAlign: "center" }}>
              <span style={{ fontSize: "2.5rem", fontWeight: "800", fontFamily: "var(--font-display)", color: isOverBudget ? "var(--danger)" : "var(--text-main)" }}>
                {todayEmissions}
              </span>
              <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "-4px" }}>
                kg CO₂e
              </span>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Budget Limit: <strong style={{ color: "var(--text-main)" }}>{budget} kg</strong>
            </p>
            {isOverBudget ? (
              <p style={{ color: "var(--danger)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center", marginTop: "4px" }}>
                <AlertTriangle size={14} /> Exceeded by {(todayEmissions - budget).toFixed(2)} kg today!
              </p>
            ) : (
              <p style={{ color: "var(--primary)", fontSize: "0.85rem", marginTop: "4px" }}>
                Under budget. Great job!
              </p>
            )}
          </div>
        </div>

        {/* Travel Logging Form */}
        <div className="card">
          <h3 className="section-title">
            <Navigation size={20} color="var(--primary)" />
            Log Transportation
          </h3>
          <form onSubmit={handleTravelSubmit}>
            <div className="form-group">
              <label htmlFor="transportType">Transport Mode</label>
              <select 
                id="transportType"
                className="form-control"
                value={transportType}
                onChange={(e) => setTransportType(e.target.value)}
              >
                <option value="car">Gasoline Car</option>
                <option value="ev">Electric Vehicle (EV)</option>
                <option value="transit">Public Transit (Bus/Train)</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bike">Bicycle</option>
                <option value="walking">Walking</option>
              </select>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label htmlFor="distance">Distance (km)</label>
                <input
                  id="distance"
                  type="number"
                  step="0.1"
                  className="form-control"
                  placeholder="5.4"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="passengers">Carpool Passengers</label>
                <select
                  id="passengers"
                  className="form-control"
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                  disabled={transportType === "bike" || transportType === "walking"}
                >
                  <option value="0">Solo (0)</option>
                  <option value="1">1 Passenger</option>
                  <option value="2">2 Passengers</option>
                  <option value="3">3+ Passengers</option>
                </select>
              </div>
            </div>

            {transportType === "car" && parseInt(passengers) > 0 && (
              <div style={{ fontSize: "0.75rem", color: "var(--success)", background: "rgba(16,185,129,0.05)", border: "1px solid var(--primary-glow)", padding: "8px", borderRadius: "6px", marginBottom: "12px" }}>
                Carpooling splits travel emissions among passengers!
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={submittingTravel}>
              {submittingTravel ? "Logging..." : travelSuccess ? <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Check size={16} /> Logged!</span> : "Log Trip"}
            </button>
          </form>
        </div>

        {/* Food Logging Form */}
        <div className="card">
          <h3 className="section-title">
            <Utensils size={20} color="var(--secondary)" />
            Log Food & Meals
          </h3>
          <form onSubmit={handleFoodSubmit}>
            <div className="form-group">
              <label htmlFor="dietType">Diet Type (Carbon Impact Factor)</label>
              <select
                id="dietType"
                className="form-control"
                value={dietType}
                onChange={(e) => setDietType(e.target.value)}
              >
                <option value="vegan">Vegan (Low Impact 🌱)</option>
                <option value="vegetarian">Vegetarian (Medium-Low 🥚)</option>
                <option value="pescatarian">Pescatarian (Medium 🐟)</option>
                <option value="low_meat">Low Meat (Medium-High 🍗)</option>
                <option value="high_meat">High Meat (High Impact 🥩)</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: "24px 0" }}>
              <div className="toggle-container">
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Food Waste? (Leftovers discarded)</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={foodWaste}
                    onChange={(e) => setFoodWaste(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              {foodWaste && (
                <p style={{ fontSize: "0.75rem", color: "var(--warning)", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertTriangle size={12} /> Food waste adds a 10% emission penalty!
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={submittingFood}>
              {submittingFood ? "Logging..." : foodSuccess ? <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Check size={16} /> Logged!</span> : "Log Meal"}
            </button>
          </form>
        </div>
      </div>

      {/* AI Recommendations Area */}
      <div>
        <h3 className="section-title" style={{ color: "var(--secondary)" }}>
          <Sparkles size={20} color="var(--secondary)" />
          AI Recommendations
        </h3>
        
        {suggestions.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            <p>Log a few activities first to trigger personalized sustainability recommendations.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {suggestions.map((rec, i) => {
              const glowColor = rec.impact === "High" ? "var(--primary)" : rec.impact === "Medium" ? "var(--secondary)" : "var(--text-dark)";
              const glowStyle = rec.impact === "High" ? "0 4px 20px rgba(16, 185, 129, 0.15)" : rec.impact === "Medium" ? "0 4px 20px rgba(6, 182, 212, 0.15)" : "none";
              return (
                <div 
                  key={i} 
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: `1px solid ${rec.impact === "High" ? "rgba(16, 185, 129, 0.3)" : rec.impact === "Medium" ? "rgba(6, 182, 212, 0.3)" : "var(--card-border)"}`,
                    boxShadow: glowStyle
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <span style={{ fontSize: "0.75rem", background: rec.impact === "High" ? "var(--primary-glow)" : rec.impact === "Medium" ? "var(--secondary-glow)" : "rgba(255,255,255,0.05)", color: glowColor, border: `1px solid ${glowColor}`, borderRadius: "4px", padding: "2px 8px", fontWeight: "600" }}>
                        {rec.impact} Impact
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: "700" }}>
                        -{rec.co2_saving} kg CO₂e
                      </span>
                    </div>
                    
                    <h4 style={{ fontSize: "1.15rem", marginBottom: "8px", fontWeight: "700" }}>{rec.title}</h4>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: "1.4" }}>{rec.action}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Activity Table */}
      <div>
        <h3 className="section-title">
          Today's Footprint Journal
        </h3>
        {logs.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
            No activities logged yet.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-main)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)", textAlign: "left" }}>
                  <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontWeight: "600", fontSize: "0.85rem" }}>Category</th>
                  <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontWeight: "600", fontSize: "0.85rem" }}>Details</th>
                  <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontWeight: "600", fontSize: "0.85rem" }}>Logged Time</th>
                  <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontWeight: "600", fontSize: "0.85rem" }}>Emissions (kg CO₂e)</th>
                  <th style={{ padding: "16px 24px", width: "80px" }}></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td style={{ padding: "16px 24px", textTransform: "capitalize", fontWeight: "600" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {log.category === "travel" ? <Navigation size={14} color="var(--primary)" /> : <Utensils size={14} color="var(--secondary)" />}
                          {log.category}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                        {log.category === "travel" ? (
                          <span>
                            {log.details.distance_km} km ({log.details.transport_type === "car" ? "Gasoline Car" : log.details.transport_type.toUpperCase()})
                            {log.details.passengers > 0 && ` • ${log.details.passengers} passengers`}
                          </span>
                        ) : (
                          <span style={{ textTransform: "capitalize" }}>
                            {log.details.diet_type} diet {log.details.food_waste && <span style={{ color: "var(--warning)" }}>(Waste Penalty)</span>}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: "0.9rem", color: "var(--text-dark)" }}>{logTime}</td>
                      <td style={{ padding: "16px 24px", fontWeight: "700", color: log.category === "travel" ? "var(--primary)" : "var(--secondary)" }}>
                        +{log.emissions.toFixed(2)}
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <button 
                          onClick={() => handleDeleteLog(log.id)}
                          style={{ background: "transparent", border: 0, color: "var(--text-dark)", cursor: "pointer", transition: "color 0.2s" }}
                          onMouseEnter={(e) => e.target.style.color = "var(--danger)"}
                          onMouseLeave={(e) => e.target.style.color = "var(--text-dark)"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
