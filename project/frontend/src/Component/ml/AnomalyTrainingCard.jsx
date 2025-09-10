// src/Component/ml/AnomalyTrainingCard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

const AnomalyTrainingCard = () => {
  const token = localStorage.getItem("token");
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [targetField, setTargetField] = useState("");
  const [contamination, setContamination] = useState(0.02);
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

  const handleTrain = async () => {
    if (!selectedDataset || !targetField) {
      setError("Please select dataset and target field.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/api/ml/anomaly/train",
        {
          dataset_name: selectedDataset,
          target_field: targetField,
          contamination: contamination,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Training failed");
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
          <h4 className="box-title text-lg font-semibold">
            🧠 Train Anomaly Detection
          </h4>
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
            <label className="block text-sm mb-1">Target Field</label>
            <input
              type="text"
              placeholder="e.g. temperature"
              className="form-control rounded p-2 w-full bg-[#2a2a2a] text-white"
              value={targetField}
              onChange={(e) => setTargetField(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="block text-sm mb-1">Contamination (0.0 - 0.5)</label>
            <input
              type="number"
              step="0.01"
              min="0.0"
              max="0.5"
              className="form-control rounded p-2 w-full bg-[#2a2a2a] text-white"
              value={contamination}
              onChange={(e) => setContamination(e.target.value)}
            />
          </div>

          <button
            onClick={handleTrain}
            disabled={loading}
            className="btn btn-primary mt-2"
            style={{ borderRadius: "6px" }}
          >
            {loading ? "Training..." : "🚀 Train Model"}
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
            <h3 className="font-semibold text-green-400">✅ Model Trained</h3>
            <p>Model ID: {result.model_id}</p>
            <p>Anomaly Rate: {result.metrics.anomaly_rate.toFixed(3)}</p>
            <p>Rows Used: {result.metrics.train_rows}</p>
            <p>Score Mean: {result.metrics.score_mean.toFixed(3)}</p>
          </div>
        )}
      </div>
    </div>
  </div>

  <Footer />
</div>

  );
};

export default AnomalyTrainingCard;
