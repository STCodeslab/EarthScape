import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

function UpdateFeedback() {
  const { id } = useParams(); // feedback ID from URL
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "", message: "" }); // type: 'success' | 'error'

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please log in to access this page.",
      }).then(() => navigate("/login"));
      return;
    }

    fetchFeedback(token);
  }, [id, navigate]);

  const fetchFeedback = async (token) => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/admin-feedback", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fb = res.data.find((f) => f._id === id);
      if (!fb) {
        Swal.fire("Error", "Feedback not found", "error").then(() =>
          navigate("/feedback-list")
        );
        return;
      }

      setFeedback(fb);
      setStatus(fb.status || "pending");
      setLoading(false);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.error || "Failed to load", "error");
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!status) {
      setAlert({ type: "error", message: "Status is required." });
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.patch(
        `http://127.0.0.1:5000/api/admin-feedback/${id}`,
        { status },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAlert({ type: "success", message: "Feedback updated successfully!" });

      // Auto-clear alert and redirect after 2s
      setTimeout(() => {
        setAlert({ type: "", message: "" });
        navigate("/feedback-list");
      }, 2000);
    } catch (err) {
      setAlert({ type: "error", message: err.response?.data?.error || "Failed to update status." });

      setTimeout(() => setAlert({ type: "", message: "" }), 2000);
    }
  };

  if (loading) return <p style={{ color: "#fff", padding: "20px" }}>Loading...</p>;

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
              <h4 className="box-title">Update Feedback</h4>
            </div>

            {/* Alert above the form */}
            {alert.message && (
              <div
                style={{
                  backgroundColor: alert.type === "success" ? "#28a745" : "#dc3545",
                  color: "#fff",
                  padding: "10px",
                  borderRadius: "4px",
                  margin: "15px",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                {alert.message}
              </div>
            )}

            <form className="form" onSubmit={handleUpdate}>
              <div className="box-body">
                <div className="form-group">
                  <label className="form-label">User Email</label>
                  <input
                    type="text"
                    className="form-control"
                    value={feedback.user_email}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-control"
                    value={feedback.message}
                    rows={5}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Created At</label>
                  <input
                    type="text"
                    className="form-control"
                    value={new Date(feedback.created_at).toLocaleString()}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="box-footer text-end d-flex justify-content-between">
                <button type="submit" className="btn btn-primary">
                  Update Status
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/feedback-list")}
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

export default UpdateFeedback;
