import React, { useEffect, useState } from "react";
import Header from "../dashboard/Header";
import Sidebar from "../dashboard/Sidebar";
import Footer from "../dashboard/Footer";
import StatsOverviewCard from "../dashboard/StatsOverviewCard";
import { toast } from "react-toastify";

const WeatherDetails = () => {
  const token = localStorage.getItem("token");
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");

  const fetchWeather = async (cityParam = "") => {
    try {
      let url = "http://127.0.0.1:5000/api/profile/weather";
      if (cityParam) url += `?city=${cityParam}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setWeather(data.weather);
        setCity(data.city);
      } else {
        toast.error(data.error || "Failed to fetch weather");
      }
    } catch {
      toast.error("Error connecting to server");
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [token]);

  if (!weather) return <p>Loading weather...</p>;

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const windDir = directions[Math.round(weather.wind_deg / 45) % 8];
  const sunrise = new Date(weather.sunrise * 1000).toLocaleTimeString();
  const sunset = new Date(weather.sunset * 1000).toLocaleTimeString();

  return (
    <div className="wrapper">
      <Header />
      <Sidebar />
      <div className="content-wrapper">
        <div className="container-full">
          <section className="content">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3>🌤 Weather Details - {city}</h3>
              <div className="d-flex">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search city..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  className="btn btn-primary ms-2"
                  onClick={() => fetchWeather(query)}
                >
                  Search
                </button>
              </div>
            </div>

            {/* Core */}
            <div className="row">
              <StatsOverviewCard title="Temperature" value={`${weather.temperature}°C`} icon="🌡️" color="success" />
              <StatsOverviewCard title="Feels Like" value={`${weather.feels_like}°C`} icon="🌤️" color="info" />
              <StatsOverviewCard title="Min Temp" value={`${weather.temp_min}°C`} icon="❄️" color="secondary" />
              <StatsOverviewCard title="Max Temp" value={`${weather.temp_max}°C`} icon="🔥" color="danger" />
       

            {/* Atmosphere */}
    
              <StatsOverviewCard title="Humidity" value={`${weather.humidity}%`} icon="💧" color="primary" />
              <StatsOverviewCard title="Pressure" value={`${weather.pressure} hPa`} icon="📊" color="warning" />
              <StatsOverviewCard title="Visibility" value={`${(weather.visibility / 1000).toFixed(1)} km`} icon="👀" color="dark" />
              <StatsOverviewCard title="Cloudiness" value={`${weather.cloudiness}%`} icon="☁️" color="info" />
   

            {/* Wind & Condition */}
           
              <StatsOverviewCard title="Wind" value={`${weather.wind_speed} m/s ${windDir}`} icon="💨" color="secondary" />
              <StatsOverviewCard title="Condition" value={weather.weather_condition} icon="🌍" color="success" />
   

            {/* Sun Info */}
        
              <StatsOverviewCard title="Sunrise" value={sunrise} icon="☀️" color="warning" />
              <StatsOverviewCard title="Sunset" value={sunset} icon="🌙" color="danger" />
            </div>

            {/* Rain/Snow */}
            <div className="row mt-4">
              {weather.rain > 0 && <StatsOverviewCard title="Rain" value={`${weather.rain} mm`} icon="🌧️" color="primary" />}
              {weather.snow > 0 && <StatsOverviewCard title="Snow" value={`${weather.snow} mm`} icon="❄️" color="info" />}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default WeatherDetails;
