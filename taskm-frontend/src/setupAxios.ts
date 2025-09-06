import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Configure the global axios defaults so existing imports of axios use the baseURL
axios.defaults.baseURL = backendUrl;
axios.defaults.withCredentials = true;

export default axios;


