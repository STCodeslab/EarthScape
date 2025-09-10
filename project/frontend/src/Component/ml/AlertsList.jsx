// src/Component/ml/AlertsList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

const darkTableStyles = {
  headCells: {
    style: {
      backgroundColor: "#1f2937",
      color: "#d1d5db",
      fontWeight: "bold",
      fontSize: "12px",
      textTransform: "uppercase",
    },
  },
  rows: {
    style: {
      backgroundColor: "#1e1e1e",
      color: "#d1d5db",
      "&:hover": { backgroundColor: "#111827" },
    },
  },
  pagination: {
    style: {
      backgroundColor: "#1e1e1e",
      color: "#d1d5db",
    },
  },
};

const AlertsList = () => {
  const token = localStorage.getItem("token");
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts();
  }, [token]);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/ml/alerts/fetch", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error("Error fetching alerts:", err);
      Swal.fire("Error", "Could not fetch alerts", "error");
    }
  };

  const handleDelete = async (alertId) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the alert.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#374151",
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(`http://127.0.0.1:5000/api/ml/alerts/${alertId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // remove deleted alert from state
      setAlerts(alerts.filter((a) => a._id !== alertId));

      Swal.fire("Deleted!", "Alert has been deleted.", "success");
    } catch (err) {
      console.error("Error deleting alert:", err);
      Swal.fire("Error", "Could not delete alert", "error");
    }
  };

  const columns = [
    { name: "ID", selector: (row) => row._id, sortable: true, grow: 2 },
    { name: "Dataset", selector: (row) => row.dataset_name, sortable: true },
    { name: "Field", selector: (row) => row.field, sortable: true },
    { name: "Threshold Type", selector: (row) => row.threshold_type, sortable: true },
    { name: "Threshold Value", selector: (row) => row.threshold_value, sortable: true },
    { name: "Active", selector: (row) => (row.active ? "✅ Yes" : "❌ No"), sortable: true },
    { name: "Role", selector: (row) => row.role, sortable: true },
    {
      name: "Created At",
      selector: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleString() : "N/A",
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <button
          className="bg-rose-600 text-dark px-3 py-1 rounded-md text-xs shadow-sm hover:bg-rose-700 transition"
          onClick={() => handleDelete(row._id)}
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="wrapper bg-[#121212] min-h-screen text-gray-200">
      <Header />
      <Sidebar />

      <div className="content-wrapper p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: "#fff" }}>🚨 Alerts</h3>
        </div>

        <div className="bg-[#1e1e1e] rounded-lg shadow-md overflow-hidden border border-gray-700 p-2">
          <DataTable
            columns={columns}
            data={alerts}
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

export default AlertsList;
