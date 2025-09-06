import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./Component/auth/ProtectedRoute"; 

import Register from "./Component/auth/Register";
import ProfileEdit from "./Component/auth/ProfileEdit";
import Login from "./Component/auth/Login";
import Dashboard from "./Component/dashboard/Dashboard";
import WeatherDetails from "./Component/weatherdetails/WeatherDetails";

import AddAdminForm from "./Component/admin/AddAdminForm";
import AdminList from "./Component/admin/AdminList";
import UpdateAdminForm from "./Component/admin/UpdateAdminForm";

import FeedbackForm from "./Component/feedback/FeedbackForm";
import FeedbackList from "./Component/feedback/FeedbackList";
import FeedbackUpdate from "./Component/feedback/UpdateFeedback";

import IngestionForm from "./Component/ingestion/UploadCsvForm";
import DatasetList from "./Component/ingestion/DatasetList";
import UploadWeatherForm from "./Component/ingestion/UploadWeatherForm";
import ImageryForm from "./Component/ingestion/ImageryForm";
import ImageryList from "./Component/ingestion/ImageryList";

import DataProcessing from "./Component/processing/DataProcessing";

// ML
import AnomalyTrainingCard from "./Component/ml/AnomalyTrainingCard";
import ModelList from "./Component/ml/ModelList";
import DetectionResults from "./Component/ml/DetectionResults";
import ForecastTrainingCard from "./Component/ml/ForecastTrainingCard";
import CorrelationAnalysisCard from "./Component/ml/CorrelationAnalysisCard";
import CreateAlertCard from "./Component/ml/CreateAlertCard";





import ChatBot from "./Component/chatbot/ChatBot";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes in one-line */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/add-admin" element={<ProtectedRoute><AddAdminForm /></ProtectedRoute>} />
        <Route path="/admin-list" element={<ProtectedRoute><AdminList /></ProtectedRoute>} />
        <Route path="/update-admin/:id" element={<ProtectedRoute><UpdateAdminForm /></ProtectedRoute>} />
        <Route path="/feedback-form" element={<ProtectedRoute><FeedbackForm /></ProtectedRoute>} />
        <Route path="/feedback-list" element={<ProtectedRoute><FeedbackList /></ProtectedRoute>} />
        <Route path="/update-feedback/:id" element={<ProtectedRoute><FeedbackUpdate /></ProtectedRoute>} />
        <Route path="/profile-edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
        <Route path="/weather-details" element={<ProtectedRoute><WeatherDetails /></ProtectedRoute>} />
     
        <Route path="/upload-csv" element={<ProtectedRoute><IngestionForm /></ProtectedRoute>} />
        <Route path="/datasets" element={<ProtectedRoute><DatasetList /></ProtectedRoute>} />
        <Route path="/upload-weather-form" element={<ProtectedRoute><UploadWeatherForm /></ProtectedRoute>} />
        <Route path="/imagery-form" element={<ProtectedRoute><ImageryForm /></ProtectedRoute>} />
        <Route path="/imagery-list" element={<ProtectedRoute><ImageryList /></ProtectedRoute>} />

        <Route path="/dataprocessing" element={<ProtectedRoute><DataProcessing /></ProtectedRoute>} />
        <Route path="/anomaly-training" element={<ProtectedRoute><AnomalyTrainingCard /></ProtectedRoute>} />
        <Route path="/forecast-training" element={<ProtectedRoute><ForecastTrainingCard /></ProtectedRoute>} />
        <Route path="/correlation-analysis" element={<ProtectedRoute><CorrelationAnalysisCard /></ProtectedRoute>} />
        <Route path="/model-list" element={<ProtectedRoute><ModelList /></ProtectedRoute>} />
        <Route path="/create-alert" element={<ProtectedRoute><CreateAlertCard /></ProtectedRoute>} />
        

         <Route path="/detection-results/:modelId" element={<DetectionResults />} />



     </Routes>

      {/* ChatBot is always visible */}
      <ChatBot />
    </Router>
  );
}

export default App;
