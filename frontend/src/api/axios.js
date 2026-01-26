import axios from 'axios';

// 1. Point to your Backend
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Important for secure cookies/sessions
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
});

export default api;
