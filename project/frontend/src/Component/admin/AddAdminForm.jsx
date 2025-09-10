import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";
import Swal from "sweetalert2";

function AddAdminForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
      confirmButtonText: "OK"
    }).then(() => {
      navigate("/login");
    });
  } else if (role !== "admin") {
    Swal.fire({
      icon: "error",
      title: "Access Denied",
      text: "Only admins can access this page.",
    }).then(() => {
      navigate("/");
    });
  }
}, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!fullName || !email || !password) {
      setError("Please fill all fields.");
      setMessage("");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("You must be logged in.");
        return;
      }

      const res = await axios.post(
        "http://127.0.0.1:5000/api/add-admin",
        {
          full_name: fullName,
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Pass JWT
          },
        }
      );

      setMessage(res.data.message || "Admin added successfully!");
      setError("");
      setFullName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred while adding admin.");
      setMessage("");
    }
  };

  const goToAdminList = () => {
    navigate("/admin-list");
  };

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
              <h4 className="box-title">Add Admin</h4>
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
                  <label className="form-label">Password</label>
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
                  <i className="ti-save-alt"></i> Save
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

export default AddAdminForm;
