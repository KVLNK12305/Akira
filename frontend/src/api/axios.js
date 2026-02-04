import axios from 'axios';

// 1. Point to your Backend
// Ensure this matches your backend port (usually 5000 or 3000)
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_URL = rawApiUrl.replace(/\/$/, '');
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || '/api';

const api = axios.create({
  baseURL: `${API_URL}${API_BASE_PATH}`,
  withCredentials: true, // Important for secure cookies/sessions

  // 🦀 RUST FEATURE SUPPORT:
  // We increase the timeout to 10s. 
  // While Rust is super fast, this prevents the UI from timing out 
  // if the "Chaos Engine" is under heavy load during the demo.
  timeout: 10000,

  headers: {
    'Content-Type': 'application/json'
  }
});

// 2. The Interceptor (The "Automatic Security Guard")
// Before sending ANY request, check if we have a token and attach it.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 3. Response Interceptor (Optional but good for Debugging Rust errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error("⚠️ RUST ENGINE TIMEOUT: The backend took too long to respond.");
    }
    return Promise.reject(error);
  }
);

export default api;