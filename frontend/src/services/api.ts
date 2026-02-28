import axios from 'axios';
import type { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

// Create axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add authorization header
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) {
          // No refresh token available, logout user
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Try to refresh token
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Update tokens in store
        useAuthStore.getState().setTokens(accessToken, newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      return Promise.reject({
        message: 'You do not have permission to access this resource',
        status: 403,
      });
    }

    if (error.response?.status === 404) {
      // Not found
      return Promise.reject({
        message: 'Resource not found',
        status: 404,
      });
    }

    if (error.response?.status === 500) {
      // Server error
      return Promise.reject({
        message: 'Server error, please try again later',
        status: 500,
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
