import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";

const OPENCAGE_API_KEY = "b3d392b8ecb14efc808b3006158fa3e0";

// 🔹 Toast configuration
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

function ImageryForm() {
  const [city, setCity] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [zoom, setZoom] = useState(6); // default zoom
  const [date, setDate] = useState("2025-01-01"); // default date
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  // Fetch coordinates from OpenCage API
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
        setLat(lat);
        setLon(lng);
      } else {
        Toast.fire({ icon: "error", title: "City not found. Enter a valid city." });
      }
    } catch (err) {
      Toast.fire({ icon: "error", title: "Failed to fetch coordinates." });
    }
  };

  // Handle Search Imagery
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!datasetName || !city || !lat || !lon) {
      Toast.fire({ icon: "warning", title: "Please fill all required fields." });
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        "http://127.0.0.1:5000/api/upload-imagery",
        {
          dataset_name: datasetName,
          city,
          latitude: lat,
          longitude: lon,
          zoom,
          date,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.preview_url) {
        setPreviewUrl(res.data.preview_url);
        Toast.fire({ icon: "success", title: res.data.message || "Imagery retrieved!" });
      } else {
        Toast.fire({ icon: "info", title: "Imagery retrieved but no preview available" });
      }
    } catch (err) {
      Toast.fire({ icon: "error", title: err.response?.data?.error || "Failed to fetch imagery" });
    } finally {
      setLoading(false);
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
        <div className="col-lg-8 col-12">
          <div className="box">
            <div className="box-header with-border">
              <h4 className="box-title">Imagery Data Search</h4>
            </div>

            <form className="form" onSubmit={handleSearch}>
              <div className="box-body">
                <div className="form-group">
                  <label>Dataset Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="Enter dataset name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    className="form-control"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      fetchCoordinates(e.target.value);
                    }}
                    placeholder="Enter city name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Zoom Level</label>
                  <input
                    type="number"
                    className="form-control"
                    value={zoom}
                    onChange={(e) => setZoom(e.target.value)}
                    placeholder="Enter zoom level (default 6)"
                  />
                </div>

                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* hidden coordinates */}
                <input type="hidden" value={lat} readOnly />
                <input type="hidden" value={lon} readOnly />
              </div>

              <div className="box-footer text-end">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Fetching..." : "Search Imagery"}
                </button>
              </div>
            </form>

            {previewUrl && (
              <div className="mt-3 p-3 border rounded bg-light text-center">
                <h5>Imagery Preview:</h5>
                <img
                  src={previewUrl}
                  alt="NASA Imagery Preview"
                  className="img-fluid rounded shadow"
                  style={{ maxHeight: "400px", objectFit: "cover" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ImageryForm;
