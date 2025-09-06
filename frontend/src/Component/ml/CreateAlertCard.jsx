// src/Component/ml/CreateAlertCard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

const CreateAlertCard = () => {
  const token = localStorage.getItem("token");
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [field, setField] = useState("");
  const [thresholdType, setThresholdType] = useState("above");
  const [thresholdValue, setThresholdValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Fetch datasets list
  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/api/datasets/livefeed", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDatasets(res.data.datasets || []))
      .catch((err) => console.error("Error fetching datasets:", err));
  }, [token]);

  const handleCreateAlert = async () => {
    if (!selectedDataset || !field || !thresholdType || thresholdValue === "") {
      setError("⚠️ Please fill all required fields.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/api/ml/alerts/create",
        {
          dataset_name: selectedDataset,
          field: field,
          threshold_type: thresholdType,
          threshold_value: parseFloat(thresholdValue),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "❌ Failed to create alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrapper" style={{ backgroundColor: "#121212", minHeight: "100vh" }}>
      <Header />
      <Sidebar />

      <div className="content-wrapper d-flex justify-content-center align-items-center" style={{ minHeight: "80vh", padding: "20px" }}>
        <div className="col-lg-6 col-12">
          <div
            className="box"
            style={{
              borderRadius: "10px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
              background: "#1e1e1e",
              color: "#e0e0e0",
              padding: "20px"
            }}
          >
            <div className="box-header with-border mb-3">
              <h4 className="box-title text-lg font-semibold">📢 Create Alert Rule</h4>
            </div>

            <div className="space-y-3">
              <div className="form-group">
                <label className="block text-sm mb-1">Select Dataset</label>
                <select
                  className="form-control rounded p-2 w-full bg-[#2a2a2a] text-white"
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                >
                  <option value="">-- Choose Dataset --</option>
                  {datasets.map((ds) => (
                    <option key={ds._id} value={ds.dataset_name}>
                      {ds.dataset_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="block text-sm mb-1">Field</label>
                <input
                  type="text"
                  placeholder="e.g. temperature"
                  className="form-control rounded p-2 w-full bg-[#2a2a2a] text-white"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="block text-sm mb-1">Threshold Type</label>
                <select
                  className="form-control rounded p-2 w-full bg-[#2a2a2a] text-white"
                  value={thresholdType}
                  onChange={(e) => setThresholdType(e.target.value)}
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
              </div>

              <div className="form-group">
                <label className="block text-sm mb-1">Threshold Value</label>
                <input
                  type="number"
                  placeholder="e.g. 40"
                  className="form-control rounded p-2 w-full bg-[#2a2a2a] text-white"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                />
              </div>

              <button
                onClick={handleCreateAlert}
                disabled={loading}
                className="btn btn-primary mt-2"
                style={{ borderRadius: "6px" }}
              >
                {loading ? "Creating..." : "✅ Create Alert"}
              </button>
            </div>

            {error && (
              <div className="alert alert-danger mt-3 text-sm">{error}</div>
            )}

            {result && (
              <div
                className="mt-4 p-3 border rounded"
                style={{ background: "#2b2b2b", borderColor: "#444" }}
              >
                <h3 className="font-semibold text-green-400">✅ Alert Created</h3>
                <p>{result.message}</p>
                <pre className="text-xs text-gray-300 mt-2">
                  {JSON.stringify(result.alert, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CreateAlertCard;
