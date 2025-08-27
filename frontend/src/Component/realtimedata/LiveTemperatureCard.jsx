import React, { useState, useEffect } from "react";
import Select from "react-select";
import axios from "axios";
import { useEventSource } from "../../hooks/useEventSource";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const LiveTemperatureCard = () => {
 
  const events = useEventSource("http://localhost:5000/api/stream/datasets");
  const [data, setData] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);

  // ---- 1. Load bootstrap data once ----
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const token = localStorage.getItem("token");
const res = await axios.get(
  `http://localhost:5000/api/datasets/latest?token=${encodeURIComponent(token || "")}`
);
        const datasets = res.data ?? [];

        const records = datasets.flatMap((d) =>
          d.records.map((r) => ({
            timestamp: r.datetime,
            [r.city]: Number(r.temperature),
          }))
        );

        setData(records);

        const allCities = [
          ...new Set(records.flatMap((d) => Object.keys(d).filter((k) => k !== "timestamp"))),
        ];
        setCities(allCities);
        if (allCities.length > 0) {
          setSelectedCities(allCities.slice(0, 3)); // pick first 3
        }
      } catch (err) {
        console.error("Error fetching datasets:", err);
      }
    };

    fetchInitial();
  }, []);

  // ---- 2. Merge SSE events with existing ----
  useEffect(() => {
    if (events.length === 0) return;

    const newData = events.flatMap((e) => {
      const records = e.document?.datasets?.[0]?.records ?? [];
      return records.map((r) => ({
        timestamp: r.datetime,
        [r.city]: Number(r.temperature),
      }));
    });

    setData((prev) => {
      const merged = [...prev];
      newData.forEach((entry) => {
        const existing = merged.find((d) => d.timestamp === entry.timestamp);
        if (existing) {
          Object.assign(existing, entry);
        } else {
          merged.push(entry);
        }
      });
      return merged;
    });

    // also update cities if new appear
    const newCities = [
      ...new Set(newData.flatMap((d) => Object.keys(d).filter((k) => k !== "timestamp"))),
    ];
    if (newCities.length > 0) {
      setCities((prev) => Array.from(new Set([...prev, ...newCities])));
    }
  }, [events]);

  return (
    <div className="box">
      <div className="box-header no-border pb-0">
        <h4 className="box-title">🌡️ Real-Time Temperature (per City)</h4>
      </div>
      <div className="box-body">
        {/* Multi-Select Dropdown */}
        <div className="mb-3">
          <label className="font-bold">Select Cities:</label>
          <Select
            isMulti
            options={cities.map((city) => ({ value: city, label: city }))}
            value={selectedCities.map((city) => ({ value: city, label: city }))}
            onChange={(selected) => setSelectedCities(selected.map((s) => s.value))}
            className="mt-2"
            placeholder="Choose cities..."
          />
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedCities.map((city, idx) => (
              <Line
                key={city}
                type="monotone"
                dataKey={city}
                stroke={`hsl(${(idx * 60) % 360}, 70%, 50%)`}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LiveTemperatureCard;
