import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";
import Swal from "sweetalert2";

const OPENCAGE_API_KEY = "b3d392b8ecb14efc808b3006158fa3e0";

function UploadWeatherForm() {
  const [datasetName, setDatasetName] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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

  // Fetch coordinates
  const fetchCoordinates = async (cityName) => {
    try {
      if (!cityName) return;
      const res = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
          cityName
        )}&key=${OPENCAGE_API_KEY}`
      );
      if (res.data && res.data.results.length > 0) {
        const { lat, lng } = res.data.results[0].geometry;
        setLatitude(lat);
        setLongitude(lng);
        setError("");
      } else {
        setError("City not found. Please enter a valid city.");
      }
    } catch (err) {
      setError("Failed to fetch coordinates. Try again later.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!datasetName || !city || !latitude || !longitude || !startDate || !endDate) {
      setError("Please fill in all fields.");
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
        "http://127.0.0.1:5000/api/upload-weather",
        {
          dataset_name: datasetName,
          city,
          latitude,
          longitude,
          start_date: startDate,
          end_date: endDate,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(res.data.message || "Weather data uploaded successfully!");
      setError("");
      setDatasetName("");
      setCity("");
      setLatitude("");
      setLongitude("");
      setStartDate("");
      setEndDate("");

      Swal.fire({
        icon: "success",
        title: "Uploaded!",
        text: `${res.data.records_count} records inserted.`,
      });
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred while uploading weather data.");
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
              <h4 className="box-title">Upload Weather Data</h4>
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
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-control"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      fetchCoordinates(e.target.value);
                    }}
                    placeholder="Enter City Name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input type="text" className="form-control" value={latitude} disabled readOnly />
                </div>

                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input type="text" className="form-control" value={longitude} disabled readOnly />
                </div>

                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="box-footer text-end">
                <button type="submit" className="btn btn-primary">
                  <i className="ti-upload"></i> Upload Weather Data
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

export default UploadWeatherForm;
