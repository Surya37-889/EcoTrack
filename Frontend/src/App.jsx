import React, { useState, useEffect } from "react";
import { Leaf, BarChart3, History, LayoutDashboard, LogOut, User, Sparkles } from "lucide-react";
import Dashboard from "./components/Dashboard";
import HistoryCharts from "./components/HistoryCharts";

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [emailInput, setEmailInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [fetchingStats, setFetchingStats] = useState(false);

  // Restore user session if present
  useEffect(() => {
    const savedUser = localStorage.getItem("ecotrack_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch dashboard stats and suggestions when user changes or updates logs
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setFetchingStats(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`/api/stats?userId=${user.uid}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      // 2. Fetch recent logs list
      const logsRes = await fetch(`/api/logs?userId=${user.uid}`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.reverse()); // Show newest first
      }

      // 3. Fetch AI Recommendations
      const aiRes = await fetch(`/api/suggestions?userId=${user.uid}`);
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setSuggestions(aiData.recommendations || []);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setFetchingStats(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setAuthError("Email is required");
      return;
    }
    setLoading(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem("ecotrack_user", JSON.stringify(data.user));
      } else {
        setAuthError("Authentication failed.");
      }
    } catch (err) {
      setAuthError("Could not connect to Flask backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setStats(null);
    setLogs([]);
    setSuggestions([]);
    localStorage.removeItem("ecotrack_user");
  };

  const refreshData = () => {
    fetchDashboardData();
  };

  if (!user) {
    return (
      <div style={{
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh",
        padding: "20px"
      }}>
        <div className="card" style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
          <div style={{ display: "inline-flex", padding: "12px", background: "var(--primary-glow)", borderRadius: "50%", marginBottom: "16px" }}>
            <Leaf size={40} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: "2rem", marginBottom: "8px", fontWeight: "700" }}>
            Welcome to <span className="gradient-text">EcoTrack</span>
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "24px" }}>
            Log habits, visualize carbon emissions, and receive personalized AI recommendations to shrink your footprint.
          </p>

          <form onSubmit={handleLogin} style={{ textAlign: "left" }}>
            <div className="form-group">
              <label htmlFor="email">Sign in with Email</label>
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="you@university.edu"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
            </div>
            {authError && (
              <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginBottom: "16px" }}>
                {authError}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: "8px" }}>
              {loading ? "Authenticating..." : "Get Started"}
            </button>
          </form>
          
          <div style={{ marginTop: "24px", borderTop: "1px solid var(--card-border)", paddingTop: "16px", fontSize: "0.8rem", color: "var(--text-dark)" }}>
            EcoTrack Local Auth System (Active Sandbox)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar Header */}
      <header style={{
        background: "rgba(11, 15, 25, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--card-border)",
        padding: "14px 24px",
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Leaf size={28} color="var(--primary)" />
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: "800", letterSpacing: "-0.5px" }}>
            Eco<span style={{ color: "var(--primary)" }}>Track</span>
          </span>
          <span style={{ fontSize: "0.75rem", background: "var(--primary-glow)", color: "var(--primary)", border: "1px solid var(--primary)", borderRadius: "4px", padding: "2px 6px", fontWeight: "600", marginLeft: "6px" }}>
            v1.0
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", gap: "8px" }}>
          <button 
            onClick={() => setActiveTab("dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: activeTab === "dashboard" ? "rgba(255,255,255,0.06)" : "transparent",
              color: activeTab === "dashboard" ? "var(--primary)" : "var(--text-muted)",
              border: 0,
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontWeight: "600",
              fontSize: "0.9rem",
              transition: "all 0.2s"
            }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab("trends")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: activeTab === "trends" ? "rgba(255,255,255,0.06)" : "transparent",
              color: activeTab === "trends" ? "var(--secondary)" : "var(--text-muted)",
              border: 0,
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontWeight: "600",
              fontSize: "0.9rem",
              transition: "all 0.2s"
            }}
          >
            <BarChart3 size={16} />
            Analytics & Trends
          </button>
        </nav>

        {/* User Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)", borderRadius: "24px", padding: "4px 12px 4px 6px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--secondary-glow)", display: "flex", alignItems: "center", justify: "center" }}>
              <User size={12} color="var(--secondary)" />
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "500" }}>
              {user.displayName}
            </span>
          </div>

          <button 
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--text-dark)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              transition: "color 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.color = "var(--danger)"}
            onMouseLeave={(e) => e.target.style.color = "var(--text-dark)"}
            title="Sign Out"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "30px 24px", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
        {activeTab === "dashboard" && (
          <Dashboard 
            user={user} 
            stats={stats} 
            logs={logs} 
            suggestions={suggestions} 
            refreshData={refreshData}
            loading={fetchingStats}
          />
        )}
        
        {activeTab === "trends" && (
          <HistoryCharts 
            user={user} 
            stats={stats} 
            logs={logs}
            refreshData={refreshData}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--card-border)",
        padding: "20px 24px",
        textAlign: "center",
        fontSize: "0.8rem",
        color: "var(--text-dark)",
        marginTop: "auto"
      }}>
        EcoTrack Dashboard &copy; 2026. Made as a college sustainability showcase project.
      </footer>
    </div>
  );
}

export default App;
