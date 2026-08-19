import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStorage';

const client = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

client.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const payload = response.data.data;
      const meta = response.data.meta;
      if (Array.isArray(payload)) {
        return { ...response, data: { items: payload, meta } };
      }
      if (payload && typeof payload === 'object' && meta && !payload.meta) {
        return { ...response, data: { ...payload, meta } };
      }
      return { ...response, data: payload !== undefined ? payload : response.data };
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const skipUrls = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
    const requestUrl = originalRequest.url || '';
    if (skipUrls.some((u) => requestUrl.includes(u))) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return client(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await axios.post('/api/v1/auth/refresh', {
        refresh_token: refreshToken,
      });

      const data = response.data?.data || response.data;
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token;

      setTokens({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });

      processQueue(null, newAccessToken);
      originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
      return client(originalRequest);
    } catch (refreshError) {
      clearTokens();
      processQueue(refreshError, null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;
