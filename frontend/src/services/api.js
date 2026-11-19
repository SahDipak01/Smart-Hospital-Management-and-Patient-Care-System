import axios from 'axios';
import { handleMockRequest } from './mockHandler';

// Detect whether we are on a static host (GitHub Pages, Netlify without dedicated backend)
const isStaticHost =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('github.io') ||
    (window.location.hostname.includes('netlify.app') && !import.meta.env.VITE_API_URL));

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with seamless interactive mock fallback for static cloud deployments
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Detect if this is an unreachable endpoint or 404 on static hosts
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
    const isNotFoundOrServerDown =
      error.response?.status === 404 ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504;

    if (originalRequest && (isNetworkError || isNotFoundOrServerDown || isStaticHost)) {
      try {
        console.warn(`[Apex Care API] Routing ${originalRequest.method?.toUpperCase()} ${originalRequest.url} to local interactive mock layer.`);
        const mockResponse = await handleMockRequest(originalRequest);
        return mockResponse;
      } catch (mockError) {
        return Promise.reject(mockError);
      }
    }

    if (error.response?.status === 401) {
      // Clear token only if on a protected route
      const currentLoc = window.location.href;
      if (!currentLoc.includes('/login') && !currentLoc.includes('/register')) {
        localStorage.removeItem('hms_token');
        localStorage.removeItem('hms_user');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
