import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";
import Swal from "sweetalert2";

function UpdateAdminForm() {
  const { id } = useParams(); // admin _id from URL
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // optional
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check token & role on page load
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please log in to access this page.",
        confirmButtonText: "OK",
      }).then(() => navigate("/login"));
      return;
    }

    if (role !== "admin") {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "Only admins can access this page.",
      }).then(() => navigate("/dashboard"));
      return;
    }

    fetchAdmin(token);
  }, [id, navigate]);

  const fetchAdmin = async (token) => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/admin-list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const admin = res.data.find((a) => a._id === id);
      if (!admin) {
        Swal.fire("Error", "Admin not found", "error");
        navigate("/admin-list");
        return;
      }
      setFullName(admin.full_name);
      setEmail(admin.email);
      setLoading(false);
    } catch (err) {
      Swal.fire("Error", "Failed to fetch admin", "error");
      navigate("/admin-list");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName || !email) {
      setError("Full Name and Email are required.");
      setMessage("");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await axios.put(
        `http://127.0.0.1:5000/api/update-admin/${id}`,
        { full_name: fullName, email, password: password || undefined },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(res.data.message || "Admin updated successfully!");
      setError("");
      setPassword(""); // clear password field after update
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred while updating admin.");
      setMessage("");
    }
  };

  const goToAdminList = () => {
    navigate("/admin-list");
  };

  if (loading) return <p style={{ color: "#fff" }}>Loading...</p>;

  return (
    <div className="wrapper">
      <Header />
      <Sidebar />

      <div
        className="content-wrapper d-flex justify-content-center align-items-center"
        style={{ minHeight: "80vh", padding: "20px" }}
      >
        <div className="col-lg-6 col-12">
          <div className="box">
            <div className="box-header with-border">
              <h4 className="box-title">Update Admin</h4>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            <form className="form" onSubmit={handleSubmit}>
              <div className="box-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password (leave blank to keep)</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                  />
                </div>
              </div>

              <div className="box-footer text-end d-flex justify-content-between">
                <button type="submit" className="btn btn-primary">
                  <i className="ti-save-alt"></i> Update
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={goToAdminList}
                >
                  <i className="ti-list"></i> View Admin List
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default UpdateAdminForm;
