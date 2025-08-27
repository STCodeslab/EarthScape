// src/Component/ml/ForecastTrainingCard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const ForecastTrainingCard = () => {
  const token = localStorage.getItem("token");
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [targetField, setTargetField] = useState("");
  const [horizon, setHorizon] = useState(24);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [forecast, setForecast] = useState(null);
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
    setForecast(null);

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/api/ml/forecast/train",
        {
          dataset_name: selectedDataset,
          target_field: targetField,
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

  const handlePredict = async () => {
    if (!result?.model_id) {
      setError("Train a model first before predicting.");
      return;
    }
    setError("");
    setLoading(true);
    setForecast(null);

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/api/ml/forecast/predict",
        {
          model_id: result.model_id,
          horizon: horizon,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setForecast(res.data.forecast);
    } catch (err) {
      setError(err.response?.data?.error || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrapper" style={{ backgroundColor: "#121212", minHeight: "100vh" }}>
      <Header />
      <Sidebar />

      <div
        className="content-wrapper d-flex justify-content-center align-items-center"
        style={{ minHeight: "80vh", padding: "20px" }}
      >
        <div className="col-lg-8 col-12">
          <div
            className="box"
            style={{
              borderRadius: "10px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
              background: "#1e1e1e",
              color: "#e0e0e0",
              padding: "20px",
            }}
          >
            <div className="box-header with-border mb-3">
              <h4 className="box-title text-lg font-semibold">
                📈 Train Forecast Model (ARIMA)
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

              <button
                onClick={handleTrain}
                disabled={loading}
                className="btn btn-primary mt-2"
                style={{ borderRadius: "6px" }}
              >
                {loading ? "Training..." : "🚀 Train Model"}
              </button>
            </div>

            {error && <div className="alert alert-danger mt-3 text-sm">{error}</div>}

            {result && (
              <div
                className="mt-4 p-3 border rounded"
                style={{ background: "#2b2b2b", borderColor: "#444" }}
              >
                <h3 className="font-semibold text-green-400">✅ Model Trained</h3>
                <p>Model ID: {result.model_id}</p>
                <p>
                  Order: (p={result.order.p}, d={result.order.d}, q={result.order.q})
                </p>
                {result.seasonal_order && (
                  <p>
                    Seasonal Order: (P={result.seasonal_order[0]}, D={result.seasonal_order[1]}, Q={result.seasonal_order[2]}, s={result.seasonal_order[3]})
                  </p>
                )}
                <p>Frequency: {result.freq || "N/A"}</p>
                <p>AIC: {result.metrics.aic.toFixed(2)}</p>
                <p>Rows Used: {result.metrics.train_rows}</p>

                <div className="form-group mt-3">
                  <label className="block text-sm mb-1">Forecast Horizon</label>
                  <input
                    type="number"
                    className="form-control rounded p-2 w-full bg-[#2a2a2a] text-white"
                    value={horizon}
                    onChange={(e) => setHorizon(e.target.value)}
                  />
                </div>

                <button
                  onClick={handlePredict}
                  disabled={loading}
                  className="btn btn-success mt-2"
                  style={{ borderRadius: "6px" }}
                >
                  {loading ? "Predicting..." : "🔮 Predict"}
                </button>
              </div>
            )}

            {forecast && (
              <div
                className="mt-4 p-3 border rounded"
                style={{ background: "#2b2b2b", borderColor: "#444" }}
              >
                <h3 className="font-semibold text-blue-400">📊 Forecast Results</h3>

                {/* Chart */}
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={forecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="ts" tick={{ fill: "#aaa", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#aaa" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e1e1e",
                          border: "1px solid #444",
                          color: "#fff",
                        }}
                      />
                      <Line type="monotone" dataKey="yhat" stroke="#4ade80" dot={false} />
                      <Line type="monotone" dataKey="yhat_lower" stroke="#f87171" dot={false} />
                      <Line type="monotone" dataKey="yhat_upper" stroke="#60a5fa" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="max-h-60 overflow-y-auto text-sm mt-4">
                  <table className="table-auto w-full text-left">
                    <thead>
                      <tr>
                        <th className="px-2 py-1">Timestamp</th>
                        <th className="px-2 py-1">yhat</th>
                        <th className="px-2 py-1">Lower</th>
                        <th className="px-2 py-1">Upper</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.map((f, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1">{f.ts}</td>
                          <td className="px-2 py-1">{f.yhat.toFixed(2)}</td>
                          <td className="px-2 py-1">{f.yhat_lower.toFixed(2)}</td>
                          <td className="px-2 py-1">{f.yhat_upper.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ForecastTrainingCard;
