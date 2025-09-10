import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    city: ""
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
           city: formData.city
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Registered successfully");
        setTimeout(() => navigate("/login"), 1200);
      } else {
        toast.error(data.error || "Registration failed");
      }
    } catch {
      toast.error("Error connecting to server");
    }
  };

  return (
    <>
      <style>
        {`
          html, body { height: 100%; margin: 0; }
          .bg-img {
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}
      </style>

      <div
        className="hold-transition theme-primary bg-img"
        style={{ backgroundImage: "url(/images/auth-bg/bg-2.jpg)" }}
      >
        <div className="col-lg-5 col-md-6 col-sm-10">
          <div className="bg-white rounded10 shadow-lg">
            <div className="content-top-agile p-20 pb-0 text-center">
              <h2 className="text-primary">Get started with Us</h2>
            </div>

            <div className="p-40">
              <form onSubmit={handleSubmit}>
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
                      placeholder="Password"
                      required
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
                      placeholder="Retype Password"
                      required
                    />
                  </div>
                </div>

                <div className="text-center">
                  <button type="submit" className="btn btn-info margin-top-10">
                    SIGN UP
                  </button>
                </div>
              </form>

              <div className="text-center mt-3">
                <p className="mb-0">
                  Already have an account?
                  <Link to="/login" className="text-danger ms-2"> Sign In</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-center" autoClose={1200} />
    </>
  );
};

export default Register;
