import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import DataTable from "react-data-table-component";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

function DetectionResults() {
  const { modelId } = useParams();
  const location = useLocation();
  const [results, setResults] = useState(location.state?.results || []);

  // If user refreshes page, no state → fetch from backend
  useEffect(() => {
    if (!results.length) {
      const fetchResults = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch("http://127.0.0.1:5000/api/ml/anomaly/score", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ model_id: modelId, latest_n: 100 }),
          });
          const data = await res.json();
          setResults(data.results || []);
        } catch (err) {
          console.error("Error fetching detection results:", err);
        }
      };
      fetchResults();
    }
  }, [modelId, results]);

  const columns = [
    { name: "#", selector: (row, i) => i + 1, width: "70px" },
    { name: "Value", selector: (row) => row.value, sortable: true },
    { name: "Score", selector: (row) => row.score?.toFixed(3), sortable: true },
    {
      name: "Anomaly",
      selector: (row) => (row.is_anomaly ? "⚠️ Yes" : "✅ No"),
      sortable: true,
    },
  ];

  // 🎨 Dark table style
  const darkTableStyles = {
    header: { style: { backgroundColor: "#1f1f1f", color: "#fff" } },
    headRow: { style: { backgroundColor: "#2a2a2a", color: "#fff" } },
    headCells: { style: { color: "#fff" } },
    rows: {
      style: { backgroundColor: "#1f1f1f", color: "#fff" },
      highlightOnHoverStyle: { backgroundColor: "#333", color: "#fff" },
    },
    pagination: {
      style: { backgroundColor: "#1f1f1f", color: "#fff" },
      pageButtonsStyle: {
        color: "#fff",
        fill: "#fff",
        backgroundColor: "transparent",
        border: "1px solid #fff",
        borderRadius: "4px",
        padding: "4px 10px",
        cursor: "pointer",
        margin: "0 2px",
      },
    },
  };

  // 🔑 Preprocess results: add index for x-axis
  const chartData = results.map((r, i) => ({
    index: i + 1,
    value: r.value,
     anomalyValue: r.is_anomaly ? r.value : null, // only anomalies show here
  }));

 const CustomDot = ({ cx, cy, payload }) => {
  if (!payload.is_anomaly) return null;
  return <circle cx={cx} cy={cy} r={6} fill="red" stroke="red" />;
};


  return (
    <div className="wrapper" style={{ backgroundColor: "#121212", minHeight: "100vh" }}>
      <Header />
      <Sidebar />

      <div className="content-wrapper" style={{ padding: "20px" }}>
        <h2 className="text-2xl font-bold mb-4 text-white">
          Detection Results for Model {modelId}
        </h2>

        {/* 📊 Line Chart */}
        <div className="bg-[#1f1f1f] p-4 rounded-xl shadow mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">Anomaly Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="index" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip />
              <Legend />

              {/* ✅ Normal values line */}
            <Line type="monotone" dataKey="value" stroke="#82ca9d" dot={false} name="Value" />
<Line type="monotone" dataKey="anomalyValue" stroke="red" dot={{ r: 6 }} name="Anomaly" />

            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 📋 Data Table */}
        <DataTable
          columns={columns}
          data={results}
          pagination
          paginationPerPage={5}
          paginationRowsPerPageOptions={[5, 10, 15, 50, 100]}
          highlightOnHover
          striped
          responsive
          customStyles={darkTableStyles}
        />
      </div>
      <Footer />
    </div>
  );
}

export default DetectionResults;
