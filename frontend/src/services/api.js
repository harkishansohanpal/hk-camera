import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

// ── Attach access token ───────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────
let refreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry on 503 (DB reconnecting after Fly.io wake)
    if (error.response?.status === 503 && !originalRequest._retry503) {
      originalRequest._retry503 = true;
      await new Promise((r) => setTimeout(r, 1500));
      return api(originalRequest);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      refreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        refreshQueue.forEach((p) => p.resolve(accessToken));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach((p) => p.reject(refreshError));
        refreshQueue = [];
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register: (data)  => api.post('/auth/register', data),
  login:    (data)  => api.post('/auth/login', data),
  logout:   (data)  => api.post('/auth/logout', data),
  refresh:  (data)  => api.post('/auth/refresh', data),
  me:       ()      => api.get('/auth/me'),
};

// ── Cameras ───────────────────────────────────────────────────
export const cameraAPI = {
  list:            ()         => api.get('/cameras'),
  create:          (data)     => api.post('/cameras', data),
  get:             (id)       => api.get(`/cameras/${id}`),
  update:          (id, data) => api.patch(`/cameras/${id}`, data),
  delete:          (id)       => api.delete(`/cameras/${id}`),
  heartbeat:       (id)       => api.post(`/cameras/${id}/heartbeat`),
};

// ── Recordings ────────────────────────────────────────────────
export const recordingAPI = {
  listAll: (params)          => api.get('/recordings', { params }),
  get:    (id)               => api.get(`/recordings/${id}`),
  delete: (id)               => api.delete(`/recordings/${id}`),
  deleteBulk: (recordingIds) => api.delete('/recordings/bulk-delete', { data: { recordingIds } }),
  upload: (cameraId, formData) =>
    api.post(`/cameras/${cameraId}/recordings`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ── Alerts ────────────────────────────────────────────────────
export const alertAPI = {
  list:        (params) => api.get('/alerts', { params }),
  motionAlert: (data)   => api.post('/alerts/motion', data),
  markRead:    (id)     => api.patch(`/alerts/${id}/read`),
  markAllRead: ()       => api.patch('/alerts/read-all'),
  delete:      (id)     => api.delete(`/alerts/${id}`),
};

// ── TURN credentials ──────────────────────────────────────────
export const turnAPI = {
  getCredentials: () => api.get('/turn-credentials'),
};

// ── Users ─────────────────────────────────────────────────────
export const userAPI = {
  updateProfile:  (data) => api.patch('/users/me', data),
  changePassword: (data) => api.patch('/users/me/password', data),
  deleteAccount:  ()     => api.delete('/users/me'),
  exportData:     ()     => api.get('/users/me/export'),
  updateDoNotSell:(data) => api.patch('/users/me/do-not-sell', data),
};

// ── Subscriptions (Stripe) ────────────────────────────────────
export const subscriptionAPI = {
  listPlans:       ()   => api.get('/subscriptions/plans'),
  getMine:         ()   => api.get('/subscriptions/mine'),
  createCheckout:  (priceId) => api.post('/subscriptions/checkout', { priceId }),
  createPortal:    ()   => api.post('/subscriptions/portal'),
  cancel:          ()   => api.post('/subscriptions/cancel'),
};

export default api;
