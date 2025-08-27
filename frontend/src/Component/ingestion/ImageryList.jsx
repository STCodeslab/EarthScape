import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

function ImageryList() {
  const [datasets, setDatasets] = useState([]);
  const [filteredDatasets, setFilteredDatasets] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  // 🆕 for preview
  const [previewImages, setPreviewImages] = useState([]); // array of URLs
  const [currentIndex, setCurrentIndex] = useState(0);

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
      const res = await axios.get("http://127.0.0.1:5000/api/datasets/imagery", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDatasets(res.data.datasets || []);
      setFilteredDatasets(res.data.datasets || []);
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
            `http://127.0.0.1:5000/api/datasets/imagery/${docId}/${filename}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          Swal.fire("Deleted!", "Dataset has been deleted.", "success");

          const updated = datasets.filter(
            (d) => !(d._id === docId && d.filename === filename)
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

  // 🔍 Search filter
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

  const handlePreview = (row) => {
    let images = [];

    if (row.gibs_url) {
      images.push(row.gibs_url);
    }

    if (row.records && row.records.length > 0) {
      images.push(...row.records.map((rec) => rec.gibs_url).filter(Boolean));
    }

    if (images.length > 0) {
      setPreviewImages(images);
      setCurrentIndex(0);
    }
  };

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
      cell: (row) => {
        const hasPreview =
          row.gibs_url || (row.records && row.records.some((rec) => rec.gibs_url));
        return (
          <div className="d-flex align-items-center gap-2">
            <a
              href={row.download_url}
              className="btn btn-primary btn-sm"
              target="_blank"
              rel="noopener noreferrer"
              title="Download"
            >
              <i className="fa fa-download"></i>
            </a>

            {hasPreview && (
              <button
                className="btn btn-info btn-sm"
                onClick={() => handlePreview(row)}
                title="Preview"
              >
                <i className="fa fa-eye"></i>
              </button>
            )}

            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleDelete(row._id, row.filename)}
              title="Delete"
            >
              <i className="fa fa-trash"></i>
            </button>
          </div>
        );
      },
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
        <h3 style={{ color: "#fff" }}>Satellite Imagery Library</h3>
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

      {/* 🆕 Bootstrap Modal for Preview with navigation */}
      {previewImages.length > 0 && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
          tabIndex="-1"
          onClick={() => setPreviewImages([])}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content bg-dark text-white">
              <div className="modal-header">
                <h5 className="modal-title">Imagery Preview</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setPreviewImages([])}
                ></button>
              </div>
              <div className="modal-body text-center">
                <img
                  src={previewImages[currentIndex]}
                  alt="Imagery Preview"
                  style={{ maxWidth: "100%", borderRadius: "8px" }}
                />
                {previewImages.length > 1 && (
                  <div className="d-flex justify-content-between mt-3">
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        setCurrentIndex((prev) =>
                          prev === 0 ? previewImages.length - 1 : prev - 1
                        )
                      }
                    >
                      ‹ Prev
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        setCurrentIndex((prev) =>
                          prev === previewImages.length - 1 ? 0 : prev + 1
                        )
                      }
                    >
                      Next ›
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default ImageryList;
