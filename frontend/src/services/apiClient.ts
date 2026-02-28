import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

// API基础URL - 从环境变量获取或使用默认值
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// 创建单例实例
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// 请求拦截器 - 添加认证token（延迟获取，避免循环依赖）
apiClient.interceptors.request.use(
  (config) => {
    // 从localStorage直接获取token，避免依赖authStore
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理认证错误（使用localStorage避免循环依赖）
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 尝试刷新token
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await apiClient.post('/auth/refresh', {
            refreshToken,
          });
          const { token, refreshToken: newRefreshToken } = response.data.data;

          // 保存新token到localStorage
          localStorage.setItem('accessToken', token);
          localStorage.setItem('refreshToken', newRefreshToken);

          // 重试原始请求
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // 刷新失败，清除本地状态并跳转到登录页
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('authStore');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// 添加便捷方法
export const apiGet = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiClient.get(url, config);
};

export const apiPost = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiClient.post(url, data, config);
};

export const apiPut = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiClient.put(url, data, config);
};

export const apiDelete = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiClient.delete(url, config);
};

export const apiPatch = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiClient.patch(url, data, config);
};