// src/Component/ml/LiveAlerts.jsx
import React, { useEffect, useState } from "react";

const LiveAlerts = () => {
  const token = localStorage.getItem("token");
  const [liveAlerts, setLiveAlerts] = useState([]);

  useEffect(() => {
    // append token in query string
    const evtSource = new EventSource(
      `http://127.0.0.1:5000/api/ml/alerts/stream?token=${token}`
    );

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📢 New alert:", data);
        setLiveAlerts((prev) => [data, ...prev]); // prepend new alerts
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    evtSource.onerror = (err) => {
      console.error("SSE error:", err);
    };

    return () => evtSource.close();
  }, [token]);

  return (
    <div className="bg-[#1e1e1e] rounded-lg shadow-md p-4 mt-6 text-gray-200">
      <h3 className="mb-3 text-white">📡 Live Alerts</h3>
      {liveAlerts.length === 0 ? (
        <p className="text-gray-400">No live alerts yet...</p>
      ) : (
        <ul className="space-y-2">
          {liveAlerts.map((alert, idx) => (
            <li key={idx} className="p-2 rounded-lg bg-[#111827] border border-gray-700">
              <strong>{alert.dataset_name}</strong> – {alert.field} ={" "}
              <span className="text-red-400">{alert.value}</span>
              <br />
              <span className="text-xs text-gray-400">
                {alert.triggered_at
                  ? new Date(alert.triggered_at).toLocaleString()
                  : "N/A"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LiveAlerts;
