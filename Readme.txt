Analyst =>
Saad
Email => Saad@gmail.com
Password => Saad@1234


Admin=>
Tayyaba
Email=> tayyabamuhammadsaleem@gmail.com
Password => Saad@1234

Backend Run : python app.py

Frontend Run : npm start


venv\Scripts\python.exe -m pip install statsmodels

venv\Scripts\python.exe -m pip install metostat

venv\Scripts\python.exe app.py



venv\Scripts\python.exe -m pip install numpy pandas scikit-learn joblib

Perfect 👌 let’s set up VS Code so it always uses your project’s virtual environment (venv\Scripts\python.exe) automatically.

🔧 Steps to Set VS Code Interpreter

Open VS Code in your project folder
(make sure you open D:\climate-eproject\backend as the root folder in VS Code).

Press Ctrl + Shift + P → type “Python: Select Interpreter” → hit Enter.

You should see a list of Python interpreters.
Look for something like:


I wanted to share the API keys I found:

Weather API Key: d8e33cdc9998b6b507b37b5ffc2b8c04

NASA API Key: KKaQCh3JRSjwRgudTliaFv9offkF5towGJRYQYeY

User Authentication and Authorization:
Implement a secure authentication system for users with different roles (e.g., administrators, analysts).
Define access controls to restrict data access based on user roles and responsibilities.

Data Ingestion:
The system should support the ingestion of diverse climate-related datasets, including satellite imagery, weather station records, and environmental sensor data.
Implement mechanisms to handle both historical and real-time data sources.
Ensure compatibility with common data formats used in climate science.

Data Storage:
Utilize the Hadoop Distributed File System (HDFS) for scalable and fault-tolerant storage of large climate datasets.
Implement data partitioning and organization strategies to optimize retrieval and processing.

Data Processing:

Implement Hadoop MapReduce jobs for parallel processing of climate data across distributed nodes.
Develop algorithms for the identification of climate patterns, anomalies, and correlations.
Include mechanisms to handle missing or incomplete data gracefully.

Real-time Data Processing:

Integrate real-time data streaming capabilities.
Ensure seamless integration with batch processing for a comprehensive analysis.

 
Machine Learning Models:
Develop machine learning models for predictive analysis of climate trends and impacts.
Include algorithms for anomaly detection, trend prediction, and correlation analysis.
Regularly update and refine models based on the latest available data.

Data Visualization:
Create interactive dashboards.
Develop visual representations of climate patterns, anomalies, and predictions.
Provide customizable and user-friendly interfaces for stakeholders to explore data

Notifications and Alerts:
Set up automated notifications and alerts for stakeholders based on predefined thresholds for climate anomalies or significant events.
Enable configurable alerting mechanisms to notify users in real-time.

Feedback and Support:
A support system for users to contact for assistance, report issues, and provide feedback.


authentication requirment is completed

ingetion is also completed we can upload csv dataset to the mongodb database and we can also fetch real time data convert it into csv and upload it on mongodb database an we are also fetching sattelite imagery from API and sotring it on mongodb database is indestion is completed

lets move on to next requirement and note we are using mongoDb instead of hadoop









































// src/Component/ml/ModelList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const ModelList = () => {
  const token = localStorage.getItem("token");
  const [models, setModels] = useState([]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/api/ml/models", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setModels(res.data.models || []);
      } catch (err) {
        console.error("Error fetching models:", err);
        Swal.fire("Error", "Could not fetch models", "error");
      }
    };

    fetchModels();
  }, [token]);

  const handleDelete = async (modelId) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the model.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(`http://127.0.0.1:5000/api/ml/models/${modelId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModels(models.filter((m) => m.model_id !== modelId));
      Swal.fire("Deleted!", "Model has been deleted.", "success");
    } catch (err) {
      console.error("Error deleting model:", err);
      Swal.fire("Error", "Could not delete model", "error");
    }
  };

  const handleRunDetection = async (modelId) => {
    try {
      Swal.fire({
        title: "Running Detection...",
        text: "Please wait while the model processes the data.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

    const res = await axios.post(
  "http://127.0.0.1:5000/api/ml/anomaly/score",
  { model_id: modelId, latest_n: 100 }, // latest 100 points
  { headers: { Authorization: `Bearer ${token}` } }
);


      Swal.fire("Success", "Detection completed successfully!", "success");
      console.log("Detection results:", res.data);
      // TODO: You can redirect to results page or show modal with res.data
    } catch (err) {
      console.error("Error running detection:", err);
      Swal.fire("Error", "Could not run detection", "error");
    }
  };

  return (
    <div className="box">
      <div className="box-header no-border pb-0">
        <h4 className="box-title">🧠 Trained Models</h4>
      </div>
      <div className="box-body overflow-x-auto">
        {models.length === 0 ? (
          <p className="text-gray-500">No models trained yet.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Model ID</th>
                <th className="p-2">Dataset</th>
                <th className="p-2">Type</th>
                <th className="p-2">Target Field</th>
                <th className="p-2">Anomaly Rate</th>
                <th className="p-2">Rows Used</th>
                <th className="p-2">Score Min</th>
                <th className="p-2">Score Mean</th>
                <th className="p-2">Score Max</th>
                <th className="p-2">Created At</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.model_id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-mono text-xs">{m.model_id}</td>
                  <td className="p-2">{m.dataset_name}</td>
                  <td className="p-2">{m.type}</td>
                  <td className="p-2">{m.target_field}</td>
                  <td className="p-2">
                    {m.metrics?.anomaly_rate?.toFixed(3) ?? "N/A"}
                  </td>
                  <td className="p-2">{m.metrics?.train_rows ?? "N/A"}</td>
                  <td className="p-2">
                    {m.metrics?.score_min?.toFixed(3) ?? "N/A"}
                  </td>
                  <td className="p-2">
                    {m.metrics?.score_mean?.toFixed(3) ?? "N/A"}
                  </td>
                  <td className="p-2">
                    {m.metrics?.score_max?.toFixed(3) ?? "N/A"}
                  </td>
                  <td className="p-2">
                    {m.created_at
                      ? new Date(m.created_at).toLocaleString()
                      : "N/A"}
                  </td>
                  <td className="p-2 space-x-2">
                    <button
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                      onClick={() => handleRunDetection(m.model_id)}
                    >
                      Run Detection
                    </button>
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                      onClick={() => handleDelete(m.model_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ModelList;
