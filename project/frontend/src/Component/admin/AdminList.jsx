import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import { FaEdit, FaTrash } from "react-icons/fa";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

function AdminList() {
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please log in to access this page.",
      }).then(() => navigate("/login"));
      return;
    }

    if (role !== "admin") {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "Only admins can view this page.",
      }).then(() => navigate("/dashboard"));
      return;
    }

    fetchAdmins(token);
  }, [navigate]);

  const fetchAdmins = async (token) => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/admin-list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const adminsWithId = res.data.map((admin) => ({
        ...admin,
        _id: admin._id || admin.id,
      }));

      setAdmins(adminsWithId);
      setFilteredAdmins(adminsWithId);
      setLoading(false);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || "Failed to load admin list.",
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    const lower = searchText.toLowerCase();
    const filtered = admins.filter(
      (a) =>
        a.full_name.toLowerCase().includes(lower) ||
        a.email.toLowerCase().includes(lower) ||
        a.role.toLowerCase().includes(lower)
    );
    setFilteredAdmins(filtered);
  }, [searchText, admins]);

  const handleEdit = (row) => {
    navigate(`/update-admin/${row._id}`);
  };

  const handleDelete = async (row) => {
    const token = localStorage.getItem("token");

    Swal.fire({
      title: `Delete ${row.full_name}?`,
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
          const adminId = row._id.toString();
          const res = await axios.delete(
            `http://127.0.0.1:5000/api/delete-admin/${adminId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          Swal.fire({
            title: "Deleted!",
            text: res.data.message,
            icon: "success",
            customClass: {
              popup: "swal-dark-popup",
              title: "swal-dark-title",
              content: "swal-dark-text",
            },
          });

          setAdmins((prev) => prev.filter((admin) => admin._id !== adminId));
          setFilteredAdmins((prev) =>
            prev.filter((admin) => admin._id !== adminId)
          );
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err.response?.data?.error || "Failed to delete the admin.",
          });
        }
      }
    });
  };

  const columns = [
    { name: "Full Name", selector: (row) => row.full_name, sortable: true },
    { name: "Email", selector: (row) => row.email, sortable: true },
    { name: "Role", selector: (row) => row.role, sortable: true },
    {
      name: "Created At",
      selector: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleString() : "-",
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div style={{ display: "flex", gap: "10px" }}>
          <FaEdit
            style={{ color: "lightblue", cursor: "pointer" }}
            onClick={() => handleEdit(row)}
          />
          <FaTrash
            style={{ color: "red", cursor: "pointer" }}
            onClick={() => handleDelete(row)}
          />
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
    <div className="wrapper">
      {/* Inline CSS for SweetAlert2 dark mode */}
      <style>{`
        .swal-dark-popup {
          background-color: #172b4c !important;
          color: #fff !important;
        }
        .swal-dark-title {
          color: #fff !important;
        }
        .swal-dark-text {
          color: #fff !important;
        }
      `}</style>

      <Header />
      <Sidebar />

      <div className="content-wrapper" style={{ padding: "20px" }}>
        <div className="container">
          <h3 style={{ color: "#fff" }}>Admin List</h3>

          <div style={{ marginBottom: "15px" }}>
            <input
              type="text"
              placeholder="Search admins..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="form-control"
              style={{ maxWidth: "300px" }}
            />
          </div>

          {loading ? (
            <p style={{ color: "#fff" }}>Loading...</p>
          ) : (
            <DataTable
              columns={columns}
              data={filteredAdmins}
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
      </div>

      <Footer />
    </div>
  );
}

export default AdminList;
