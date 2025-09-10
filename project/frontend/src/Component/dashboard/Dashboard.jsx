import React, { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

import StatsOverviewCard from "./StatsOverviewCard";
import LiveDatasetChart from "../realtimedata/LiveDatasetChart";
import LiveDatasetFeedCard from "../realtimedata/LiveDatasetFeedCard";
import { toast } from "react-toastify";

const Dashboard = () => {
  const token = localStorage.getItem("token");
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/api/profile/weather", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (res.ok) {
          setWeather(data.weather);
        } else {
          toast.error(data.error || "Failed to fetch weather");
        }
      } catch {
        toast.error("Error connecting to server");
      }
    };

    fetchWeather();
  }, [token]);

  if (!weather) {
    return (
      <div className="wrapper">
        <Header />
        <Sidebar />
        <div className="content-wrapper">
          <div className="container-full">
            <section className="content">
              <p>Loading weather...</p>
            </section>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Wind direction → compass
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const windDir = directions[Math.round(weather.wind_deg / 45) % 8];

  // Sunrise/Sunset → local time
  const sunrise = new Date(weather.sunrise * 1000).toLocaleTimeString();
  const sunset = new Date(weather.sunset * 1000).toLocaleTimeString();

  return (
    <div className="wrapper">
      <Header />
      <Sidebar />

      <div className="content-wrapper">
        <div className="container-full">
          <section className="content">
    {/* Top Weather Stats */}
<div className="row">
  <StatsOverviewCard title="Temperature" value={`${weather.temperature}°C`} icon="🌡️" color="success" />
  <StatsOverviewCard title="Feels Like" value={`${weather.feels_like}°C`} icon="🌤️" color="info" />
  <StatsOverviewCard title="Humidity" value={`${weather.humidity}%`} icon="💧" color="primary" />
  <StatsOverviewCard title="Pressure" value={`${weather.pressure} hPa`} icon="📊" color="warning" />
  <StatsOverviewCard title="Wind" value={`${weather.wind_speed} m/s ${windDir}`} icon="💨" color="secondary" />
  <StatsOverviewCard title="Condition" value={weather.weather_condition} icon="🌍" color="success" />
  <StatsOverviewCard title="Sunrise" value={sunrise} icon="☀️" color="warning" />
  <StatsOverviewCard title="Sunset" value={sunset} icon="🌙" color="danger" />
</div>

 <div className="row mt-4">
              <div className="col-xl-8 col-12">
                <LiveDatasetChart />
              </div>
              <div className="col-xl-4 col-12">
                <LiveDatasetFeedCard />
              </div>
            </div>


          </section>

   

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
