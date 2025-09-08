import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const AlertsDropdown = () => {
  const font = {}; // Define the 'font' object to avoid errors
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);

  const token = localStorage.getItem("token");

  // Fetch existing alerts
  useEffect(() => {
    if (!token) return;

    const fetchLogs = async () => {
      try {
        const res = await axios.get(
          "http://127.0.0.1:5000/api/ml/alerts/logs?limit=50",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.logs) {
          // Deduplicate by timestamp + field + dataset_name
          const uniqueAlerts = Array.from(
            new Map(res.data.logs.map(a => [
              `${a.dataset_name}-${a.field}-${a.triggered_at}`,
              a
            ])).values()
          );
          setAlerts(uniqueAlerts);
        }
      } catch (err) {
        console.error("Failed to fetch alert logs:", err);
      }
    };

    fetchLogs();
  }, [token]);

  // SSE for live alerts
  useEffect(() => {
    if (!token) return;

    const evtSource = new EventSource(
      `http://127.0.0.1:5000/api/ml/alerts/stream?token=${token}`
    );

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setAlerts(prev => {
          const key = `${data.dataset_name}-${data.field}-${data.triggered_at}`;
          if (prev.find(a => `${a.dataset_name}-${a.field}-${a.triggered_at}` === key)) {
            return prev; // avoid duplicates
          }
          return [data, ...prev.slice(0, 49)]; // keep max 50 alerts
        });

        // Show toast for new alerts
        toast.info(
          `⚠️ ${data.rule || "Alert"}: ${data.dataset_name} – ${data.field} = ${data.value}`,
          { position: "top-right", autoClose: 15000, hideProgressBar: false }
        );

      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    evtSource.onerror = (err) => console.error("SSE error:", err);

    return () => evtSource.close();
  }, [token]);

  const formatDate = (date) => {
    if (!date) return "N/A";
    const iso = date.$date || date;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "Invalid Date" : d.toLocaleString();
  };

  return (
    <>
      <a
        className="waves-effect waves-light dropdown-toggle no-border p-5"
        onClick={() => setOpen(!open)}
      >
        <i
  style={{ ...font, fontSize: "34px" }}
  className="fa fa-bell waves-effect waves-light dropdown-toggle no-border p-5"
></i>

    
        {alerts.length > 0 && (
          <span className="absolute top-0 right-0 inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </a>

      {open && (
        <ul className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded shadow-lg z-50">
          <li className="p-2 border-b border-gray-700 text-white font-semibold bg-gray-800">
            ⚠️ Latest Alerts
          </li>
          {alerts.length === 0 ? (
            <li className="p-2 text-gray-400">No alerts yet...</li>
          ) : (
            alerts.map((alert, idx) => (
              <li
                key={idx}
                className="p-2 border-b border-gray-700 hover:bg-gray-800 text-white"
              >
                <div className="font-semibold text-sm mb-1">
                  {alert.rule || "Alert"}
                </div>
                <div className="text-sm">
                  {alert.dataset_name} – {alert.field} ={" "}
                  <span className="text-red-400">{alert.value}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Data: {formatDate(alert.ts)}
                </div>
                <div className="text-xs text-gray-400">
                  Triggered: {formatDate(alert.triggered_at)}
                </div>
                <div className="text-xs text-gray-500">
                  Source: {alert.source || "system"}
                </div>
              </li>
            ))
          )}
        </ul>
      )}

      <ToastContainer />
    </>
  );
};

export default AlertsDropdown;
