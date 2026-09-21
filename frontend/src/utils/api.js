import axios from "axios";

// Base URL API - production endpoint
// Untuk development lokal, buat file .env dengan VITE_API_URL=http://localhost:5050
export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.kingcreativestudio.my.id/luar-jendela";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("ljc_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for unified error formatting
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto-logout if session expired
      if (window.location.pathname !== "/login") {
        localStorage.removeItem("ljc_token");
        localStorage.removeItem("ljc_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
