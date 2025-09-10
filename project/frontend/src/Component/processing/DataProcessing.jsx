import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

function DataProcessing() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState("");
  const [operation, setOperation] = useState("count");
  const [results, setResults] = useState(null);
  const [view, setView] = useState("table"); // table | chart
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  const monthNames = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please log in first.",
      });
      return;
    }
    fetchDatasets(token);
  }, []);

  const fetchDatasets = async (token) => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/datasets", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Flatten nested datasets
      const flat = [];
      res.data.datasets.forEach((userDoc) => {
        userDoc.datasets.forEach((ds) => {
          flat.push({
            doc_id: userDoc._id,
            dataset_name: ds.dataset_name,
            filename: ds.filename,
          });
        });
      });

      setDatasets(flat);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "Failed to load datasets.",
      });
    }
  };

  const fetchFields = async (datasetName) => {
    setSelectedDataset(datasetName);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://127.0.0.1:5000/api/dataset/${datasetName}/fields`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFields(res.data.fields);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "Failed to fetch fields.",
      });
    }
  };

  const runProcessing = async () => {
    if (!selectedDataset || !operation) {
      Swal.fire("Error", "Please select dataset and operation.", "warning");
      return;
    }

  if (["average", "group_by", "pattern"].includes(operation) && !selectedField) {
    Swal.fire("Error", "Please select a field for this operation.", "warning");
    return;
  }
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `http://127.0.0.1:5000/api/dataset/${selectedDataset}/process`,
        { operation, field: selectedField },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResults(res.data);
      setPage(1); // reset pagination
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "Failed to process dataset.",
      });
    }
  };

  const downloadResults = (type = "json") => {
    if (!results) return;

    if (type === "json") {
      const blob = new Blob([JSON.stringify(results, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "results.json";
      link.click();
    } else if (type === "csv") {
      const keys = Object.keys(results[0] || {});
      const csv = [
        keys.join(","),
        ...results.map((row) => keys.map((k) => row[k]).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "results.csv";
      link.click();
    }
  };

  // Pagination
  const paginatedResults = Array.isArray(results)
    ? results.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    : results;

  // Top 20 for charts
  const topResults =
    (operation === "group_by" || operation === "pattern") && Array.isArray(results)
      ? [...results].sort((a, b) => b.count - a.count).slice(0, 20)
      : [];

  return (
    <div className="wrapper" style={{ backgroundColor: "#121212", minHeight: "100vh" }}>
      <Header />
      <Sidebar />
      <div className="content-wrapper" style={{ padding: "20px", color: "#fff" }}>
        <h3>Data Processing</h3>

        {/* Dataset Dropdown */}
        <select
          className="form-control"
          value={selectedDataset}
          onChange={(e) => fetchFields(e.target.value)}
        >
          <option value="">-- Choose Dataset --</option>
          {datasets.map((d, idx) => (
            <option key={idx} value={d.dataset_name}>
              {d.dataset_name}
            </option>
          ))}
        </select>

        {/* Fields Dropdown */}
      {fields.length > 0 && operation !== "count" && (
  <select
    className="form-control mt-2"
    value={selectedField}
    onChange={(e) => setSelectedField(e.target.value)}
  >
    <option value="">-- Choose Field --</option>
    {fields.map((f, idx) => (
      <option key={idx} value={f}>
        {f}
      </option>
    ))}
  </select>
)}


        {/* Operation Dropdown */}
        <div style={{ margin: "15px 0" }}>
          <label>Select Operation:</label>
          <select
            className="form-control"
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            style={{ backgroundColor: "#2a2a2a", color: "#fff", border: "1px solid #444" }}
          >
            <option value="count">Count</option>
            <option value="average">Average</option>
            <option value="group_by">Group By</option>
            <option value="pattern">Pattern Detection</option>
          </select>
        </div>

      

        <button
  className="btn btn-success mb-3"
  onClick={runProcessing}
  disabled={
    !selectedDataset ||
    (["average", "group_by", "pattern"].includes(operation) && !selectedField)
  }
>
  Run Processing
</button>


        {/* Results */}
        {results && (
          <div style={{ marginTop: "20px" }}>
            <h4>Results</h4>

            {/* Controls */}
            <div className="mb-3">
              <button
                className="btn btn-sm btn-primary me-5"
                onClick={() => setView("table")}
              >
                Table View
              </button>
              {(operation === "group_by" || operation === "pattern") && (
                <button
                  className="btn btn-sm btn-info me-5"
                  onClick={() => setView("chart")}
                >
                  Chart View
                </button>
              )}
              <button
                className="btn btn-sm btn-warning me-5"
                onClick={() => downloadResults("json")}
              >
                Download JSON
              </button>
              {Array.isArray(results) && (
                <button
                  className="btn btn-sm btn-warning"
                  onClick={() => downloadResults("csv")}
                >
                  Download CSV
                </button>
              )}
            </div>

            {/* Table View */}
            {view === "table" && Array.isArray(results) && (
              <div>
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <table className="table table-dark table-sm">
                    <thead>
                      <tr>
                        {Object.keys(results[0] || {}).map((k) => (
                          <th key={k}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedResults.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((v, i) => (
                            <td key={i}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="mt-2">
                  {Array.from({
                    length: Math.ceil(results.length / rowsPerPage),
                  }).map((_, i) => (
                    <button
                      key={i}
                      className={`btn btn-sm me-5 ${
                        page === i + 1 ? "btn-light" : "btn-secondary"
                      } mr-1`}
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Single object result */}
            {view === "table" && !Array.isArray(results) && (
              <pre
                style={{
                  backgroundColor: "#2a2a2a",
                  padding: "10px",
                  borderRadius: "5px",
                  color: "#fff",
                }}
              >
                {JSON.stringify(results, null, 2)}
              </pre>
            )}

            {/* Chart View */}
            {view === "chart" &&
              (operation === "group_by" || operation === "pattern") &&
              topResults.length > 0 && (
                <ResponsiveContainer width="100%" height={350}>
  {operation === "group_by" ? (
    // Always bar chart for group_by
    <BarChart data={topResults}>
      <XAxis dataKey="_id" stroke="#fff" />
      <YAxis stroke="#fff" />
      <Tooltip />
      <Bar dataKey="count" fill="#3b82f6" />
    </BarChart>
  ) : operation === "pattern" ? (
    // Pattern → decide chart type based on field values
    Number.isInteger(topResults[0]?._id) &&
    topResults[0]._id >= 1 &&
    topResults[0]._id <= 12 ? (
      // If _id looks like a month → LineChart
      <LineChart data={topResults}>
        <XAxis
          dataKey="_id"
          stroke="#fff"
          tickFormatter={(val) => monthNames[val - 1] || val}
        />
        <YAxis stroke="#fff" />
        <Tooltip labelFormatter={(val) => monthNames[val - 1] || val} />
        <Line type="monotone" dataKey="count" stroke="#3b82f6" />
      </LineChart>
    ) : (
      // Otherwise numeric/string pattern → BarChart
      <BarChart data={topResults}>
        <XAxis dataKey="_id" stroke="#fff" />
        <YAxis stroke="#fff" />
        <Tooltip />
        <Bar dataKey="count" fill="#3b82f6" />
      </BarChart>
    )
  ) : null}
</ResponsiveContainer>

              )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default DataProcessing;
