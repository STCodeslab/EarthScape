import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import { FaCheck, FaTrash, FaEdit } from "react-icons/fa";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

function FeedbackList() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const role = localStorage.getItem("role");
  const userEmail = localStorage.getItem("email"); 

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please log in to access this page.",
        customClass: {
          popup: "swal-dark-popup",
          title: "swal-dark-title",
          content: "swal-dark-text",
        },
      }).then(() => navigate("/login"));
      return;
    }
    fetchFeedbacks(token);
  }, [navigate]);

  const fetchFeedbacks = async (token) => {
    try {
      const url =
        role === "admin"
          ? "http://127.0.0.1:5000/api/admin-feedback"
          : "http://127.0.0.1:5000/api/feedback-list";

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const feedbacksWithId = res.data.map((f) => ({ ...f, _id: f._id || f.id }));
      setFeedbacks(feedbacksWithId);
      setFilteredFeedbacks(feedbacksWithId);
      setLoading(false);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "Failed to load feedback list.",
        customClass: {
          popup: "swal-dark-popup",
          title: "swal-dark-title",
          content: "swal-dark-text",
        },
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    const lower = searchText.toLowerCase();
    const filtered = feedbacks.filter(
      (f) =>
        f.user_email?.toLowerCase().includes(lower) ||
        f.message?.toLowerCase().includes(lower) ||
        (f.status && f.status.toLowerCase().includes(lower))
    );
    setFilteredFeedbacks(filtered);
  }, [searchText, feedbacks]);

  const handleResolve = async (row) => {
    const token = localStorage.getItem("token");

    Swal.fire({
      title: `Mark feedback from ${row.user_email} as Resolved?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, resolve it!",
      customClass: {
        popup: "swal-dark-popup",
        title: "swal-dark-title",
        content: "swal-dark-text",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await axios.patch(
            `http://127.0.0.1:5000/api/admin-feedback/${row._id}`,
            { status: "resolved" },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          Swal.fire({
            title: "Resolved!",
            text: res.data.message || "Feedback marked as resolved.",
            icon: "success",
            customClass: {
              popup: "swal-dark-popup",
              title: "swal-dark-title",
              content: "swal-dark-text",
            },
          });

          setFeedbacks((prev) =>
            prev.map((f) =>
              f._id === row._id ? { ...f, status: "resolved" } : f
            )
          );
          setFilteredFeedbacks((prev) =>
            prev.map((f) =>
              f._id === row._id ? { ...f, status: "resolved" } : f
            )
          );
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err.response?.data?.error || "Failed to update status.",
            customClass: {
              popup: "swal-dark-popup",
              title: "swal-dark-title",
              content: "swal-dark-text",
            },
          });
        }
      }
    });
  };

  const handleDelete = async (row) => {
    const token = localStorage.getItem("token");

    Swal.fire({
      title: `Delete feedback from ${row.user_email}?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      customClass: {
        popup: "swal-dark-popup",
        title: "swal-dark-title",
        content: "swal-dark-text",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(
            `http://127.0.0.1:5000/api/admin-feedback/${row._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          Swal.fire({
            title: "Deleted!",
            text: "Feedback removed successfully.",
            icon: "success",
            customClass: {
              popup: "swal-dark-popup",
              title: "swal-dark-title",
              content: "swal-dark-text",
            },
          });

          setFeedbacks((prev) => prev.filter((f) => f._id !== row._id));
          setFilteredFeedbacks((prev) => prev.filter((f) => f._id !== row._id));
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err.response?.data?.error || "Failed to delete feedback.",
            customClass: {
              popup: "swal-dark-popup",
              title: "swal-dark-title",
              content: "swal-dark-text",
            },
          });
        }
      }
    });
  };

  const columns = [
    { name: "Email", selector: (row) => row.user_email, sortable: true },
    {
      name: "Message",
      selector: (row) => row.message,
      sortable: true,
      cell: (row) => (
        <div>
          {row.message.length > 50 ? (
            <>
              {row.message.substring(0, 50)}...
              <button
                style={{
                  marginLeft: "5px",
                  border: "none",
                  background: "none",
                  color: "#00f",
                  cursor: "pointer",
                }}
                onClick={() =>
                  Swal.fire({
                    title: "Full Feedback",
                    text: row.message,
                    icon: "info",
                    customClass: {
                      popup: "swal-dark-popup",
                      title: "swal-dark-title",
                      content: "swal-dark-text",
                    },
                  })
                }
              >
                View
              </button>
            </>
          ) : (
            row.message
          )}
        </div>
      ),
    },
    { name: "Status", selector: (row) => row.status || "pending", sortable: true },

    ...(role === "admin"
      ? [
          {
            name: "Resolved",
            cell: (row) =>
              row.status !== "resolved" ? (
                <FaCheck
                  style={{ color: "green", cursor: "pointer" }}
                  onClick={() => handleResolve(row)}
                />
              ) : (
                <span style={{ color: "lightgreen", fontWeight: "bold" }}>✓</span>
              ),
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
          },
          {
            name: "Actions",
            cell: (row) => (
              <div style={{ display: "flex", gap: "10px" }}>
                <FaEdit
                  style={{ color: "lightblue", cursor: "pointer" }}
                  onClick={() => navigate(`/update-feedback/${row._id}`)}
                />
                <FaTrash
                  style={{ color: "red", cursor: "pointer" }}
                  onClick={() => handleDelete(row)}
                />
              </div>
            ),
          },
        ]
      : []),
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
    style: {
      backgroundColor: "#1f1f1f",
      color: "#fff",
    },
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
        <h3 style={{ color: "#fff" }}>Feedback List</h3>
        <input
          type="text"
          placeholder="Search feedback..."
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
            data={filteredFeedbacks}
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

      {/* SweetAlert Dark Theme */}
      <style>{`
        .swal-dark-popup { background-color: #172b4c !important; color: #fff !important; }
        .swal-dark-title { color: #fff !important; }
        .swal-dark-text { color: #fff !important; }
      `}</style>
    </div>
  );
}

export default FeedbackList;
