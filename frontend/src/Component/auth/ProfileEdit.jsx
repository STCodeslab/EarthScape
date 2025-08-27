import React, { useState, useEffect } from "react";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProfileEdit = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    city: "",
    password: "",
    confirm_password: ""
  });

  // Load current profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/api/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (res.ok) {
          setFormData({
            full_name: data.full_name || "",
            email: data.email || "",
            city: data.city || "",
            password: "",
            confirm_password: ""
          });
        } else {
          toast.error(data.error || "Failed to load profile");
        }
      } catch {
        toast.error("Error connecting to server");
      }
    };

    fetchProfile();
  }, [token]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          city: formData.city,
          password: formData.password || undefined, // optional
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Profile updated successfully");
        setTimeout(() => navigate("/"), 1200);
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch {
      toast.error("Error connecting to server");
    }
  };

  return (
   <div className="wrapper">
      <Header />
      <Sidebar />

      <div
        className="content-wrapper d-flex justify-content-center align-items-center"
        style={{ minHeight: "80vh", padding: "20px" }}
      >
        <div className="col-lg-5 col-md-6 col-sm-10">
          <div className="bg-white rounded10 shadow-lg">
            <div className="content-top-agile p-20 pb-0 text-center">
              <h2 className="text-primary">Edit Profile</h2>
            </div>

            <div className="p-40">
              <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div className="form-group">
                  <div className="input-group mb-3">
                    <span className="input-group-text bg-transparent">
                      <i className="ti-user"></i>
                    </span>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="form-control ps-15 bg-transparent"
                      placeholder="Full Name"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="form-group">
                  <div className="input-group mb-3">
                    <span className="input-group-text bg-transparent">
                      <i className="ti-email"></i>
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-control ps-15 bg-transparent"
                      placeholder="Email"
                      required
                    />
                  </div>
                </div>

                {/* City */}
                <div className="form-group">
                  <div className="input-group mb-3">
                    <span className="input-group-text bg-transparent">
                      <i className="ti-location-pin"></i>
                    </span>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="form-control ps-15 bg-transparent"
                      placeholder="City"
                      required
                    />
                  </div>
                </div>

                {/* Password (optional) */}
                <div className="form-group">
                  <div className="input-group mb-3">
                    <span className="input-group-text bg-transparent">
                      <i className="ti-lock"></i>
                    </span>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="form-control ps-15 bg-transparent"
                      placeholder="New Password (optional)"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="input-group mb-3">
                    <span className="input-group-text bg-transparent">
                      <i className="ti-lock"></i>
                    </span>
                    <input
                      type="password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      className="form-control ps-15 bg-transparent"
                      placeholder="Confirm New Password"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <button type="submit" className="btn btn-info margin-top-10">
                    Update Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-center" autoClose={1200} />
    <Footer />
    </div>
  );
};

export default ProfileEdit;
