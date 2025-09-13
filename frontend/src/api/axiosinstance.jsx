// src/api/axiosInstance.js
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  // withCredentials: true, // enable if your server uses cookies / sessions
});

api.interceptors.request.use((cfg) => {
  // Example: attach token if available
  // const token = localStorage.getItem("token");
  // if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const e = err.response
      ? { status: err.response.status, data: err.response.data }
      : { message: err.message };
    return Promise.reject(e);
  }
);

export default api;
