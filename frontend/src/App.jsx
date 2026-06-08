import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import QuizEngine from "./pages/QuizEngine";
import AdminDashboard from "./pages/AdminDashboard";
import Result from "./pages/Result";
import ProtectedRoute from "./components/ProtectedRoute";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              user?.role === "user" ? (
                <Dashboard />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/quiz/:quizId"
            element={user ? <QuizEngine /> : <Navigate to="/" replace />}
          />
          <Route
            path="/result/:attemptId"
            element={user ? <Result /> : <Navigate to="/" replace />}
          />
          <Route
            path="/admin"
            element={
              user?.role === "admin" ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
