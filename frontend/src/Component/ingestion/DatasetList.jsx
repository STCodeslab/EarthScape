import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

function DatasetList() {
  const [datasets, setDatasets] = useState([]);
  const [filteredDatasets, setFilteredDatasets] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

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

      // Flatten nested datasets for table
      const flat = [];
      res.data.datasets.forEach((userDoc) => {
        userDoc.datasets.forEach((ds) => {
          flat.push({
            doc_id: userDoc._id,   // ✅ actual MongoDB ObjectId for parent doc
            user_id: userDoc.user_id,
            dataset_name: ds.dataset_name,
            filename: ds.filename,
            uploaded_at: ds.uploaded_at,
            uploaded_by: ds.uploaded_by,
            records_count: ds.records_count,
            download_url: ds.download_url,
          });
        });
      });

      setDatasets(flat);
      setFilteredDatasets(flat);
      setLoading(false);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "Failed to load datasets.",
      });
      setLoading(false);
    }
  };

  // 🗑️ Delete dataset
  const handleDelete = async (docId, filename) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    Swal.fire({
      title: "Are you sure?",
      text: `Delete dataset "${filename}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(
            `http://127.0.0.1:5000/api/datasets/${docId}/${filename}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          Swal.fire("Deleted!", "Dataset has been deleted.", "success");

          // Remove deleted dataset from state
          const updated = datasets.filter(
            (d) => !(d.doc_id === docId && d.filename === filename)
          );
          setDatasets(updated);
          setFilteredDatasets(updated);
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err.response?.data?.error || "Failed to delete dataset.",
          });
        }
      }
    });
  };

  useEffect(() => {
    const lower = searchText.toLowerCase();
    const filtered = datasets.filter(
      (d) =>
        d.dataset_name.toLowerCase().includes(lower) ||
        d.filename.toLowerCase().includes(lower) ||
        d.uploaded_by.toLowerCase().includes(lower)
    );
    setFilteredDatasets(filtered);
  }, [searchText, datasets]);

  const columns = [
    { name: "Dataset Name", selector: (row) => row.dataset_name, sortable: true },
    { name: "Filename", selector: (row) => row.filename, sortable: true },
    { name: "Uploaded By", selector: (row) => row.uploaded_by, sortable: true },
    {
      name: "Uploaded At",
      selector: (row) => row.uploaded_at,
      sortable: true,
      cell: (row) =>
        row.uploaded_at ? new Date(row.uploaded_at).toLocaleString() : "N/A",
    },
    { name: "Records Count", selector: (row) => row.records_count, sortable: true },
    {
      name: "Action",
      cell: (row) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <a
            href={row.download_url}
            className="btn btn-sm btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => handleDelete(row.doc_id, row.filename)} // ✅ use doc_id
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const darkTableStyles = {
    header: { style: { backgroundColor: "#1f1f1f", color: "#fff" } },
    headRow: { style: { backgroundColor: "#2a2a2a", color: "#fff" } },
    headCells: { style: { color: "#fff" } },
    rows: {
      style: { backgroundColor: "#1f1f1f", color: "#fff" },
      highlightOnHoverStyle: { backgroundColor: "#333", color: "#fff" },
    },
    pagination: {
      style: { backgroundColor: "#1f1f1f", color: "#fff" },
      pageButtonsStyle: {
        color: "#fff",
        fill: "#fff",
        backgroundColor: "transparent",
        border: "1px solid #fff",
        borderRadius: "4px",
        padding: "4px 10px",
        cursor: "pointer",
        margin: "0 2px",
      },
    },
  };

  return (
    <div className="wrapper" style={{ backgroundColor: "#121212", minHeight: "100vh" }}>
      <Header />
      <Sidebar />
      <div className="content-wrapper" style={{ padding: "20px" }}>
        <h3 style={{ color: "#fff" }}>Uploaded Datasets</h3>
        <input
          type="text"
          placeholder="Search datasets..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="form-control"
          style={{
            maxWidth: "300px",
            marginBottom: "15px",
            backgroundColor: "#2a2a2a",
            color: "#fff",
            border: "1px solid #444",
          }}
        />

        {loading ? (
          <p style={{ color: "#fff" }}>Loading...</p>
        ) : (
          <DataTable
            columns={columns}
            data={filteredDatasets}
            pagination
            paginationPerPage={5}
            paginationRowsPerPageOptions={[5, 10, 15]}
            highlightOnHover
            striped
            responsive
            customStyles={darkTableStyles}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}

export default DatasetList;
