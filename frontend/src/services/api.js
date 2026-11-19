import axios from 'axios';
import { handleMockRequest } from './mockHandler';

// Detect whether we are running on a static cloud host without a dedicated backend server
const isStaticHost =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('github.io') ||
   window.location.hostname.includes('netlify.app') ||
   window.location.hostname.includes('vercel.app') ||
   window.location.protocol === 'file:' ||
   (!import.meta.env.VITE_API_URL && window.location.port !== '5173'));

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
  // If running on static hosting without custom VITE_API_URL, route directly via client mock adapter
  adapter: isStaticHost ? async (config) => handleMockRequest(config) : undefined,
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

// Response interceptor: catches HTML fallback responses (Netlify SPA rewrites) or 404/network errors
api.interceptors.response.use(
  async (response) => {
    // If a static server rewrite returned index.html instead of JSON:
    const isHtmlResponse =
      typeof response.data === 'string' &&
      (response.data.includes('<!doctype') ||
       response.data.includes('<!DOCTYPE') ||
       response.data.includes('<html'));

    if (isHtmlResponse) {
      console.warn(`[Apex Care API] Server returned HTML for ${response.config?.url}. Falling back to mock layer.`);
      return handleMockRequest(response.config);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (originalRequest) {
      try {
        console.warn(`[Apex Care API] Falling back to mock layer for ${originalRequest.url}: ${error.message}`);
        return await handleMockRequest(originalRequest);
      } catch (mockError) {
        return Promise.reject(mockError);
      }
    }

    if (error.response?.status === 401) {
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
