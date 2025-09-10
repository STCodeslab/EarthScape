import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";
import Swal from "sweetalert2";

function FeedbackForm() {
  const [fullName, setFullName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const email = localStorage.getItem("email"); // get logged-in email

    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please log in to access this page.",
        confirmButtonText: "OK"
      }).then(() => {
        navigate("/login");
      });
    } else {
      setUserEmail(email); // store email in state
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName || !messageText) {
      setError("Please fill all fields.");
      setMessage("");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://127.0.0.1:5000/api/feedback",
        {
          full_name: fullName,
          email: userEmail, // use logged-in email
          message: messageText
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage(res.data.message || "Feedback submitted successfully!");
      setError("");
      setFullName("");
      setMessageText("");
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred while submitting feedback.");
      setMessage("");
    }
  };

  const goToFeedbackList = () => {
    navigate("/feedback-list");
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
              <h4 className="box-title">Submit Feedback</h4>
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

                {/* Email field hidden */}
                <input type="hidden" value={userEmail} />

                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-control"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Your feedback"
                  ></textarea>
                </div>
              </div>

              <div className="box-footer text-end d-flex justify-content-between">
                <button type="submit" className="btn btn-primary">
                  Submit
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={goToFeedbackList}
                >
                  View Feedback List
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

export default FeedbackForm;
