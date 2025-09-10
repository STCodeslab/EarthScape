// src/Component/ml/ModelList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

const darkTableStyles = {
  headCells: {
    style: {
      backgroundColor: "#1f2937", // gray-800
      color: "#d1d5db", // gray-300
      fontWeight: "bold",
      fontSize: "12px",
      textTransform: "uppercase",
    },
  },
  rows: {
    style: {
      backgroundColor: "#1e1e1e",
      color: "#d1d5db",
      "&:hover": {
        backgroundColor: "#111827", // gray-900
      },
    },
  },
  pagination: {
    style: {
      backgroundColor: "#1e1e1e",
      color: "#d1d5db",
    },
  },
};

const ModelList = () => {
  const token = localStorage.getItem("token");
  const [models, setModels] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/api/ml/models", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setModels(res.data.models || []);
      } catch (err) {
        console.error("Error fetching models:", err);
        Swal.fire("Error", "Could not fetch models", "error");
      }
    };

    fetchModels();
  }, [token]);

  const handleDelete = async (modelId) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the model.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#374151",
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(`http://127.0.0.1:5000/api/ml/models/${modelId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModels(models.filter((m) => m.model_id !== modelId));
      Swal.fire("Deleted!", "Model has been deleted.", "success");
    } catch (err) {
      console.error("Error deleting model:", err);
      Swal.fire("Error", "Could not delete model", "error");
    }
  };

  const handleRunDetection = async (modelId) => {
    try {
      Swal.fire({
        title: "Running Detection...",
        text: "Please wait while the model processes the data.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await axios.post(
        "http://127.0.0.1:5000/api/ml/anomaly/score",
        { model_id: modelId, latest_n: 100 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.close();
      navigate(`/detection-results/${modelId}`, {
        state: { results: res.data.results },
      });
    } catch (err) {
      console.error("Error running detection:", err);
      Swal.fire("Error", "Could not run detection", "error");
    }
  };

  const columns = [
    { name: "Model ID", selector: (row) => row.model_id, sortable: true },
    { name: "Dataset", selector: (row) => row.dataset_name, sortable: true },
    { name: "Type", selector: (row) => row.type, sortable: true },
    { name: "Target Field", selector: (row) => row.target_field, sortable: true },
    { name: "Anomaly Rate", selector: (row) => row.metrics?.anomaly_rate?.toFixed(3) ?? "N/A" },
    { name: "Rows Used", selector: (row) => row.metrics?.train_rows ?? "N/A" },
    { name: "Score Min", selector: (row) => row.metrics?.score_min?.toFixed(3) ?? "N/A" },
    { name: "Score Mean", selector: (row) => row.metrics?.score_mean?.toFixed(3) ?? "N/A" },
    { name: "Score Max", selector: (row) => row.metrics?.score_max?.toFixed(3) ?? "N/A" },
    { 
      name: "Created At", 
      selector: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : "N/A" 
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="space-x-2">
          <button
            className="bg-indigo-600 text-dark px-3 py-1 rounded-md text-xs shadow-sm hover:bg-indigo-700 transition"
            onClick={() => handleRunDetection(row.model_id)}
          >
            Run Detection
          </button>
          <button
            className="bg-rose-600 text-dark px-3 py-1 rounded-md text-xs shadow-sm hover:bg-rose-700 transition"
            onClick={() => handleDelete(row.model_id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="wrapper bg-[#121212] min-h-screen text-gray-200">
      <Header />
      <Sidebar />

      <div className="content-wrapper p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: "#fff" }}>🧠 Trained Models</h3>
   
        </div>

        <div className="bg-[#1e1e1e] rounded-lg shadow-md overflow-hidden border border-gray-700 p-2">
          <DataTable
            columns={columns}
            data={models}
            pagination
            paginationPerPage={5}
            paginationRowsPerPageOptions={[5, 10, 15, 50, 100]}
            highlightOnHover
            striped
            responsive
            customStyles={darkTableStyles}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ModelList;
