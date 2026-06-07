import axios from 'axios';

// Bulletproof check: Falls back strictly to Render in production.
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) return 'https://quiz-z0p0.onrender.com/api';
  return 'http://localhost:5000/api'; 
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

// Inject JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Bulletproof Error Normalizer
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Handle Auto-Logout on Invalid Tokens
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    // 2. Prevent React Error #31 (Objects rendered as children)
    if (error.response && error.response.data) {
      const eData = error.response.data;
      let safeString = 'A network or server error occurred.';
      
      // Safely extract a string no matter what weird object the server returns
      if (typeof eData.error === 'string') safeString = eData.error;
      else if (typeof eData.message === 'string') safeString = eData.message;
      else if (eData.error?.message) safeString = eData.error.message;
      else if (typeof eData === 'string') safeString = eData;
      else safeString = error.message || safeString;
      
      // Force the error payload to be a primitive string
      error.response.data.error = safeString;
    } else if (!error.response) {
      // Handle Network/CORS errors where response is completely undefined
      error.response = { data: { error: error.message || "Network Error: Could not connect to server." } };
    }
    
    return Promise.reject(error);
  }
);