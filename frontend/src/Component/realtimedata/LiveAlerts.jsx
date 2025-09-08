import React, { useEffect, useState } from "react";

const LiveAlerts = () => {
  const [liveAlerts, setLiveAlerts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const evtSource = new EventSource(
      `http://127.0.0.1:5000/api/ml/alerts/stream?token=${token}`
    );

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Filter duplicates: same dataset, field, timestamp
        setLiveAlerts((prev) => {
          const exists = prev.find(
            (a) =>
              a.dataset_name === data.dataset_name &&
              a.field === data.field &&
              ((a.triggered_at?.$date || a.triggered_at) ===
                (data.triggered_at?.$date || data.triggered_at))
          );
          if (exists) return prev;
          return [data, ...prev];
        });

        console.log("📢 New alert:", data);
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    evtSource.onerror = (err) => {
      console.error("SSE connection error:", err);
    };

    return () => evtSource.close();
  }, []);

  const formatDate = (date) => {
    if (!date) return "N/A";

    // Convert MongoDB extended JSON to ISO string
    const iso = date.$date || date;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "Invalid Date" : d.toLocaleString();
  };

  const formatUser = (user) => {
    if (!user) return "N/A";
    return user.$oid || user;
  };

  return (
    <div className="bg-[#1e1e1e] rounded-lg shadow-md overflow-hidden border border-gray-700 p-4 mt-6">
      <h3 className="text-white mb-3">📡 Live Alerts</h3>
      {liveAlerts.length === 0 ? (
        <p className="text-gray-400">No live alerts yet...</p>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {liveAlerts.map((alert, idx) => (
            <li
              key={idx}
              className={`p-2 rounded-lg border border-gray-700 ${
                alert.source === "anomaly_model" || alert.source === "anomaly_score"
                  ? "bg-[#4b1e8a] text-white"
                  : "bg-[#111827] text-gray-200"
              }`}
            >
              <strong>{alert.dataset_name}</strong> – {alert.field} ={" "}
              <span className="text-red-400">{alert.value}</span>
              <br />
              <span className="text-xs text-gray-400">
                Data Timestamp: {formatDate(alert.ts)}
              </span>
              <br />
              <span className="text-xs text-gray-400">
                Alert Triggered At: {formatDate(alert.triggered_at)}
              </span>
              <br />
              <span className="text-xs text-gray-500">
                Source: {alert.source || "system"}
              </span>
              <br />
              <span className="text-xs text-gray-500">
                User ID: {formatUser(alert.user_id)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LiveAlerts;
