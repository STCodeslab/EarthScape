import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";
import Swal from "sweetalert2";

function UploadCsvForm() {
  const [datasetName, setDatasetName] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please log in to access this page.",
        confirmButtonText: "OK",
      }).then(() => navigate("/login"));
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!datasetName || !file) {
      setError("Please provide both dataset name and CSV file.");
      setMessage("");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("You must be logged in.");
        return;
      }

      const formData = new FormData();
      formData.append("dataset_name", datasetName);
      formData.append("file", file);

      const res = await axios.post("http://127.0.0.1:5000/api/upload-csv", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage(res.data.message || "CSV uploaded successfully!");
      setError("");
      setDatasetName("");
      setFile(null);

      Swal.fire({
        icon: "success",
        title: "Uploaded!",
        text: `${res.data.inserted_count} records inserted.`,
      });
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred while uploading CSV.");
      setMessage("");
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
        <div className="col-lg-6 col-12">
          <div className="box">
            <div className="box-header with-border">
              <h4 className="box-title">Upload Dataset</h4>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            <form className="form" onSubmit={handleSubmit}>
              <div className="box-body">
                <div className="form-group">
                  <label className="form-label">Dataset Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="Enter Dataset Name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Upload CSV File</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".csv"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </div>
              </div>

              <div className="box-footer text-end">
                <button type="submit" className="btn btn-primary">
                  <i className="ti-upload"></i> Upload
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

export default UploadCsvForm;
