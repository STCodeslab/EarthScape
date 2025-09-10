// src/Component/realtimedata/LiveDatasetFeedCard.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useEventSource } from "../../hooks/useEventSource";

const LiveDatasetFeedCard = () => {
  const token = localStorage.getItem("token");
  const [batchData, setBatchData] = useState([]);
  const [expanded, setExpanded] = useState({}); // track expanded datasets
  const feedEndRef = useRef(null);

  // Subscribe to SSE
  const events = useEventSource(
    `http://127.0.0.1:5000/api/stream/datasets?token=${token}`
  );

  // Fetch historical batch datasets (on load)
// Fetch historical batch datasets (on load)
useEffect(() => {
  axios
    .get("http://127.0.0.1:5000/api/datasets/livefeed", {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => {
      const data = res.data.datasets.map((d) => ({
        dataset_name: d.dataset_name || "Unnamed",
        filename: d.filename || "N/A",
        uploaded_by: d.uploaded_by || "Unknown",
        uploaded_at: d.uploaded_at || null,
        records_count: d.records_count ?? null,
        records: d.records || [],
      }));

      setBatchData(data);
    })
    .catch((err) => console.error("Error fetching batch data:", err));
}, [token]);


  // Normalize incoming live events too
  const normalizedEvents = Array.isArray(events)
    ? events.map((e) => ({
        dataset_name: e.dataset_name || "Unnamed",
        filename: e.filename || "N/A",
        uploaded_by: e.uploaded_by || "Unknown",
        uploaded_at: e.uploaded_at || new Date().toISOString(),
        records_count: e.records_count ?? null,
        records: e.records || [],
      }))
    : [];

  // Merge past + live datasets
  const combinedData = [...batchData, ...normalizedEvents];

  // Auto-scroll to latest
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [combinedData]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="box">
      <div className="box-header no-border pb-0">
        <h4 className="box-title">📡 Live Dataset Feed</h4>
      </div>
      <div className="box-body">
        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
          <div className="p-4">
            <h2 className="text-xl font-bold mb-2">📡 Dataset Updates</h2>
            <ul className="space-y-3 text-sm">
              {combinedData.map((ds, i) => {
                const dsId = `ds-${i}`;
                return (
                  <li
                    key={dsId}
                    className="p-3 rounded shadow-sm hover:bg-gray-50 transition"
                  >
                    <p className="font-semibold">📂 {ds.dataset_name}</p>
                    <p className="text-xs text-gray-600">
                      File: {ds.filename || "N/A"}
                    </p>
                    <p className="text-xs text-gray-600">
                      Uploaded by: {ds.uploaded_by || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-600">
                      Records: {ds.records_count ?? "N/A"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Uploaded:{" "}
                      {ds.uploaded_at
                        ? new Date(ds.uploaded_at).toLocaleString()
                        : "Unknown"}
                    </p>

                    {ds.records && ds.records.length > 0 && (
                      <div className="mt-2">
                        <button
                          className="text-blue-600 text-xs underline"
                          onClick={() => toggleExpand(dsId)}
                        >
                          {expanded[dsId]
                            ? "Hide Records ▲"
                            : "View Records ▼"}
                        </button>

                        {expanded[dsId] && (
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mt-2 max-h-40 overflow-y-auto">
                            {JSON.stringify(ds.records.slice(0, 10), null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}

              {/* Scroll anchor */}
              <div ref={feedEndRef} />
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDatasetFeedCard;
