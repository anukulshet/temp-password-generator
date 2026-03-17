/**
 * api.js — All backend calls in one place
 * Base URL reads from Vite env variable, falls back to localhost.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/refresh`,
          { refreshToken },
        );
        localStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const signup = (email, masterPassword) =>
  api.post('/auth/signup', { email, masterPassword });

export const login = (email, masterPassword) =>
  api.post('/auth/login', { email, masterPassword });

// ── Resources ─────────────────────────────────────────────────────────────────
export const getResources = () => api.get('/resources');

export const getResource = (id) => api.get(`/resources/${id}`);

export const createResource = (data) => api.post('/resources', data);

export const deleteResource = (id) => api.delete(`/resources/${id}`);

// ── Access Tokens ─────────────────────────────────────────────────────────────
export const createAccessToken = (data) => api.post('/access', data);

export const getTokens = (resourceId) => api.get(`/access/resource/${resourceId}`);

export const revokeToken = (tokenId) => api.patch(`/access/${tokenId}/revoke`);

// ── Audit ─────────────────────────────────────────────────────────────────────
export const getAuditLogs = () => api.get('/audit');
