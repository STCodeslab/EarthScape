// src/Component/realtimedata/LiveDatasetChart.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useEventSource } from "../../hooks/useEventSource";
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

const LiveDatasetChart = () => {
  const token = localStorage.getItem("token");
  const [chartData, setChartData] = useState([]);

  // SSE subscription
  const events = useEventSource(
    `http://127.0.0.1:5000/api/stream/datasets?token=${token}`
  );

  // Load historical batch datasets
  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/api/datasets/livefeed", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const formatted = res.data.datasets.map((d) => ({
          name: d.dataset_name || "Unnamed",
          time: d.uploaded_at
            ? new Date(d.uploaded_at).toLocaleTimeString()
            : "Unknown",
          records: d.records_count ?? 0,
        }));
        setChartData(formatted);
      })
      .catch((err) => console.error("Error fetching chart data:", err));
  }, [token]);

  // Normalize live events
  useEffect(() => {
    if (Array.isArray(events)) {
      const formatted = events.map((e) => ({
        name: e.dataset_name || "Unnamed",
        time: new Date().toLocaleTimeString(),
        records: e.records_count ?? 0,
      }));

      // Append new points (keep latest 20 for performance)
      setChartData((prev) => [...prev, ...formatted].slice(-20));
    }
  }, [events]);

  return (
    <div className="box mt-4">
      <div className="box-header no-border pb-0">
        <h4 className="box-title">📊 Live Dataset Chart</h4>
      </div>
      <div className="box-body">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="records"
              stroke="#17E88F"
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LiveDatasetChart;
