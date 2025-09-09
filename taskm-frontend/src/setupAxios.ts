import axios from 'axios';

// Vite automatically reads from .env or .env.production based on the mode
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: backendUrl,
  withCredentials: true
});

export default api;
