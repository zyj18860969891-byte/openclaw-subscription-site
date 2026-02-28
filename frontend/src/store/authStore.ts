import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Type definitions
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface AuthStore extends AuthState {
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
}

// API client helper functions (避免循环依赖)
const apiCall = async (endpoint: string, data: any = null) => {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${import.meta.env.VITE_API_URL || '/api'}${endpoint}`;
  
  // 根据是否有数据来决定使用 POST 还是 GET 方法
  const options: RequestInit = {
    method: data ? 'POST' : 'GET',
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  console.log('API Request:', {
    url,
    method: options.method,
    hasData: !!data,
    data: data ? JSON.stringify(data) : null,
    headers
  });

  const response = await fetch(url, options);
  
  console.log('API Response:', {
    status: response.status,
    statusText: response.statusText,
    url: response.url
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error);
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // Login action
      login: async (email: string, password: string) => {
        try {
          const response = await apiCall('/auth/login', {
            email,
            password,
          } as LoginRequest);

          const { user, accessToken, refreshToken } = response.data;

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
          });
        } catch (error) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      // Register action
      register: async (email: string, password: string, name: string) => {
        try {
          const response = await apiCall('/auth/register', {
            email,
            password,
            name,
          } as RegisterRequest);

          const { user, accessToken, refreshToken } = response.data;

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
          });
        } catch (error) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      // Check authentication action
      checkAuth: async () => {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) {
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
            });
            return;
          }

          const response = await apiCall('/auth/profile');
          const { user } = response.data;

          set({
            user,
            accessToken: token,
            isAuthenticated: true,
          });
        } catch (error) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      // Set tokens action
      setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({
          accessToken,
          refreshToken,
        });
      },

      // Set user action
      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
