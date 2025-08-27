import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate, Navigate, Link } from "react-router-dom";

const Header = () => {
   const navigate = useNavigate();

 const token = localStorage.getItem("token");

  // If no token → block render & redirect immediately
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://127.0.0.1:5000/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        // Clear localStorage
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
   localStorage.removeItem("user_id");
        toast.success(data.message || "Logged out successfully");
        navigate("/login");
      } else {
        toast.error(data.error || "Logout failed");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    }
  };
  return (
    <header className="main-header">
      <div className="d-flex align-items-center logo-box justify-content-start">
        <a href="index.html" className="logo">
          <div className="logo-mini w-30">
            <span className="light-logo">
              <img src="../images/logo-letter.png" alt="logo" />
            </span>
            <span className="dark-logo">
              <img src="../images/logo-letter.png" alt="logo" />
            </span>
          </div>
          <div className="logo-lg">
            <span className="light-logo">
              <img src="../images/logo-dark-text.png" alt="logo" />
            </span>
            <span className="dark-logo">
              <img src="../images/logo-light-text.png" alt="logo" />
            </span>
          </div>
        </a>
      </div>

      <nav className="navbar navbar-static-top">
        {/* Sidebar toggle */}
        <div className="app-menu">
          <ul className="header-megamenu nav">
        
           
          </ul>
        </div>

        {/* Right Menu */}
        <div className="navbar-custom-menu r-side">
          <ul className="nav navbar-nav">
            <li className="dropdown user user-menu">
              <a
                href="#"
                className="waves-effect waves-light dropdown-toggle no-border p-5"
                data-bs-toggle="dropdown"
                title="User"
              >
                <img
                  className="avatar avatar-pill"
                  src="../images/avatar/3.jpg"
                  alt=""
                />
              </a>
              <ul className="dropdown-menu animated flipInX">
                <li className="user-body">
                  <Link className="dropdown-item" to="/profile-edit">
                    <i className="ti-user text-muted me-2"></i> Profile
                  </Link>

                 
             
                  <button
                    className="dropdown-item"
                    onClick={handleLogout}
 style={{ 
    cursor: "pointer", 
    border: "none", 
    color: "#b5b5c3"  
  }}
                  >
                    <i className="ti-lock text-muted me-2"></i> Logout
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Header;
