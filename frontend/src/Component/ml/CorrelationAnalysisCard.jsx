import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line
} from "recharts";

const CorrelationAnalysisCard = () => {
  const token = localStorage.getItem("token");
  const [datasets, setDatasets] = useState([]);

  // ACF states
  const [acfDataset, setAcfDataset] = useState("");
  const [acfField, setAcfField] = useState("");
  const [acfData, setAcfData] = useState([]);

  // Cross correlation states
  const [cross1, setCross1] = useState({ dataset: "", field: "" });
  const [cross2, setCross2] = useState({ dataset: "", field: "" });
  const [crossCorr, setCrossCorr] = useState(null);

  // Matrix states
  const [matrixFields, setMatrixFields] = useState([]);
  const [matrix, setMatrix] = useState(null);

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

  const fetchACF = async () => {
    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/api/ml/correlation/autocorr",
        {
          dataset_name: acfDataset,
          target_field: acfField,
          max_lag: 30,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAcfData(res.data.acf);
    } catch (err) {
      setError(err.response?.data?.error || "ACF failed");
    }
  };

  const fetchCross = async () => {
    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/api/ml/correlation/cross",
        {
          dataset1: { name: cross1.dataset, field: cross1.field },
          dataset2: { name: cross2.dataset, field: cross2.field },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCrossCorr(res.data.correlation);
    } catch (err) {
      setError(err.response?.data?.error || "Cross-correlation failed");
    }
  };

  const fetchMatrix = async () => {
    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/api/ml/correlation/matrix",
        { fields: matrixFields },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMatrix(res.data.matrix);
    } catch (err) {
      setError(err.response?.data?.error || "Matrix failed");
    }
  };

  const addMatrixField = () => {
    setMatrixFields([...matrixFields, { dataset: "", field: "" }]);
  };

  return (
    <div className="wrapper" style={{ backgroundColor: "#121212", minHeight: "100vh" }}>
      <Header />
      <Sidebar />
      <div className="content-wrapper p-4">
        <div className="col-lg-10 col-12 mx-auto">
          <div className="box bg-[#1e1e1e] text-white rounded-lg shadow p-4">
            <h3 className="text-lg font-bold mb-3">🔗 Correlation Analysis</h3>

            {/* ACF */}
            <div className="mb-6">
              <h4 className="text-md font-semibold mb-2">Auto-correlation (ACF)</h4>
              <select
                value={acfDataset}
                onChange={(e) => setAcfDataset(e.target.value)}
                className="form-control mb-2 bg-[#2a2a2a] text-white"
              >
                <option value="">-- Select Dataset --</option>
                {datasets.map((ds) => (
                  <option key={ds._id} value={ds.dataset_name}>
                    {ds.dataset_name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={acfField}
                onChange={(e) => setAcfField(e.target.value)}
                placeholder="Field name"
                className="form-control mb-2 bg-[#2a2a2a] text-white"
              />
              <button className="btn btn-primary" onClick={fetchACF}>
                Run ACF
              </button>

              {acfData.length > 0 && (
                <div className="mt-3" style={{ height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={acfData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="lag" tick={{ fill: "#aaa", fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="corr" fill="#60a5fa" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Cross correlation */}
            <div className="mb-6">
              <h4 className="text-md font-semibold mb-2">Cross-correlation</h4>
              <div className="flex gap-2 mb-2">
                <select
                  value={cross1.dataset}
                  onChange={(e) => setCross1({ ...cross1, dataset: e.target.value })}
                  className="form-control bg-[#2a2a2a] text-white"
                >
                  <option value="">-- Dataset 1 --</option>
                  {datasets.map((ds) => (
                    <option key={ds._id} value={ds.dataset_name}>
                      {ds.dataset_name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Field"
                  value={cross1.field}
                  onChange={(e) => setCross1({ ...cross1, field: e.target.value })}
                  className="form-control bg-[#2a2a2a] text-white"
                />
              </div>

              <div className="flex gap-2 mb-2">
                <select
                  value={cross2.dataset}
                  onChange={(e) => setCross2({ ...cross2, dataset: e.target.value })}
                  className="form-control bg-[#2a2a2a] text-white"
                >
                  <option value="">-- Dataset 2 --</option>
                  {datasets.map((ds) => (
                    <option key={ds._id} value={ds.dataset_name}>
                      {ds.dataset_name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Field"
                  value={cross2.field}
                  onChange={(e) => setCross2({ ...cross2, field: e.target.value })}
                  className="form-control bg-[#2a2a2a] text-white"
                />
              </div>

              <button className="btn btn-success" onClick={fetchCross}>
                Compute Cross-Correlation
              </button>

              {crossCorr !== null && (
                <p className="mt-2 text-sm">
                  Correlation: <span className="font-bold">{crossCorr.toFixed(3)}</span>
                </p>
              )}
            </div>

            {/* Correlation matrix */}
            <div>
              <h4 className="text-md font-semibold mb-2">Correlation Matrix</h4>
              {matrixFields.map((f, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <select
                    value={f.dataset}
                    onChange={(e) => {
                      const copy = [...matrixFields];
                      copy[i].dataset = e.target.value;
                      setMatrixFields(copy);
                    }}
                    className="form-control bg-[#2a2a2a] text-white"
                  >
                    <option value="">-- Dataset --</option>
                    {datasets.map((ds) => (
                      <option key={ds._id} value={ds.dataset_name}>
                        {ds.dataset_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Field"
                    value={f.field}
                    onChange={(e) => {
                      const copy = [...matrixFields];
                      copy[i].field = e.target.value;
                      setMatrixFields(copy);
                    }}
                    className="form-control bg-[#2a2a2a] text-white"
                  />
                </div>
              ))}
              <button className="btn btn-secondary mb-2" onClick={addMatrixField}>
                ➕ Add Field
              </button>
              <button className="btn btn-warning mb-2 ml-2" onClick={fetchMatrix}>
                Run Matrix
              </button>

              {matrix && (
                <div className="overflow-x-auto mt-3 text-sm">
                  <table className="table-auto border-collapse border border-gray-700 w-full">
                    <thead>
                      <tr>
                        <th className="border border-gray-700 p-1">Field</th>
                        {Object.keys(matrix).map((col) => (
                          <th key={col} className="border border-gray-700 p-1">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(matrix).map((row) => (
                        <tr key={row}>
                          <td className="border border-gray-700 p-1">{row}</td>
                          {Object.keys(matrix[row]).map((col) => (
                            <td key={col} className="border border-gray-700 p-1 text-center">
                              {matrix[row][col].toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {error && <div className="alert alert-danger mt-3 text-sm">{error}</div>}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CorrelationAnalysisCard;
