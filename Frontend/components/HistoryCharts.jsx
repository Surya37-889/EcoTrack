import React from "react";
import { Line, Bar } from "react-chartjs-2";
import { Calendar, BarChart3, TrendingUp, ShieldAlert, Award, Star } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function HistoryCharts({ user, stats, logs, refreshData }) {
  if (!stats) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "50px", color: "var(--text-muted)" }}>
        <p>Loading analytics dashboard...</p>
      </div>
    );
  }

  const { history_30_days, breakdown_14_days, heatmap, summary, budget } = stats;

  // 1. Line Chart Data (30-day history with budget line)
  const lineChartData = {
    labels: history_30_days.labels,
    datasets: [
      {
        label: "Daily Emissions (kg CO₂e)",
        data: history_30_days.emissions,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
      },
      {
        label: "Budget Limit",
        data: history_30_days.budget_line,
        borderColor: "#ef4444",
        borderDash: [6, 6],
        borderWidth: 1.5,
        pointStyle: "none",
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#94a3b8",
          font: { family: "Outfit" },
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" },
        title: {
          display: true,
          text: "kg CO₂e",
          color: "#94a3b8",
        },
      },
      x: {
        grid: { color: "transparent" },
        ticks: { color: "#94a3b8", maxRotation: 45, minRotation: 45 },
      },
    },
  };

  // 2. Stacked Bar Chart Data (14-day category breakdown)
  const barChartData = {
    labels: breakdown_14_days.labels,
    datasets: [
      {
        label: "Travel",
        data: breakdown_14_days.travel,
        backgroundColor: "#10b981",
      },
      {
        label: "Food",
        data: breakdown_14_days.food,
        backgroundColor: "#06b6d4",
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#94a3b8",
          font: { family: "Outfit" },
        },
      },
    },
    scales: {
      y: {
        stacked: true,
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" },
        title: {
          display: true,
          text: "kg CO₂e",
          color: "#94a3b8",
        },
      },
      x: {
        stacked: true,
        grid: { color: "transparent" },
        ticks: { color: "#94a3b8" },
      },
    },
  };

  // 3. Heatmap calendar computation
  // Sort dates for sequential rendering in custom calendar grid
  const heatmapEntries = Object.entries(heatmap).sort((a, b) => a[0].localeCompare(b[0]));

  const getHeatmapColor = (value) => {
    if (value === 0) return "#1e293b"; // slate-800
    if (value <= 3.0) return "#065f46"; // emerald-800 (Low)
    if (value <= 7.0) return "#047857"; // emerald-700 (Moderate)
    if (value <= budget) return "#d97706"; // amber-600 (Warning)
    return "#b91c1c"; // red-700 (Exceeded)
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      
      {/* Stats Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--primary-glow)", borderRadius: "12px" }}>
            <TrendingUp size={24} color="var(--primary)" />
          </div>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>30-Day Total</span>
            <h4 style={{ fontSize: "1.6rem", fontWeight: "700" }}>{summary.total_30_days} kg</h4>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--secondary-glow)", borderRadius: "12px" }}>
            <BarChart3 size={24} color="var(--secondary)" />
          </div>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>7-Day Average</span>
            <h4 style={{ fontSize: "1.6rem", fontWeight: "700" }}>{summary.average_7_days} kg</h4>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "rgba(16,185,129,0.1)", borderRadius: "12px" }}>
            <Award size={24} color="var(--primary)" />
          </div>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Best Day (Lowest)</span>
            <h4 style={{ fontSize: "1.3rem", fontWeight: "700" }}>{summary.best_day.value} kg</h4>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dark)" }}>
  {summary.best_day?.date?.slice(5) || ""}
</span>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "rgba(239,68,68,0.1)", borderRadius: "12px" }}>
            <ShieldAlert size={24} color="var(--danger)" />
          </div>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Worst Day (Highest)</span>
            <h4 style={{ fontSize: "1.3rem", fontWeight: "700" }}>{summary.worst_day.value} kg</h4>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dark)" }}>{summary.worst_day?.date?.slice(5) || ""}</span>
          </div>
        </div>
      </div>

      {/* Chart Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "24px" }}>
        
        {/* 30-Day Line Chart */}
        <div className="card" style={{ minHeight: "350px", display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={18} color="var(--primary)" />
            30-Day Carbon Trend
          </h3>
          <div style={{ flex: 1, position: "relative" }}>
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* 14-Day Stacked Bar Chart */}
        <div className="card" style={{ minHeight: "350px", display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart3 size={18} color="var(--secondary)" />
            Emissions Breakdown by Category
          </h3>
          <div style={{ flex: 1, position: "relative" }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* Heatmap calendar grid */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Calendar size={18} color="var(--primary)" />
          Activity Heatmap (Past 30 Days)
        </h3>
        
        {/* Heatmap Grid rendering */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "flex-start", marginBottom: "16px" }}>
          {heatmapEntries.map(([date, val]) => (
            <div 
              key={date}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "4px",
                backgroundColor: getHeatmapColor(val),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.65rem",
                fontWeight: "700",
                color: val > 0 ? "rgba(255,255,255,0.8)" : "transparent",
                cursor: "default",
                transition: "all 0.2s"
              }}
              title={`${date}: ${val} kg CO₂e`}
            >
              {val > 0 ? val.toFixed(0) : ""}
            </div>
          ))}
        </div>

        {/* Heatmap Legend */}
        <div style={{ display: "flex", gap: "16px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "3px", backgroundColor: "#1e293b" }}></div>
            No Logs
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "3px", backgroundColor: "#065f46" }}></div>
            Low (&le; 3kg)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "3px", backgroundColor: "#047857" }}></div>
            Medium (&le; 7kg)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "3px", backgroundColor: "#d97706" }}></div>
            High (&le; Budget)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "3px", backgroundColor: "#b91c1c" }}></div>
            Exceeded (&gt; Budget)
          </div>
        </div>
      </div>

    </div>
  );
}

export default HistoryCharts;
