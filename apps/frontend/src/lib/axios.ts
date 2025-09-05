/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { useAuthStore } from "@/store/store";

// Simple API URL setup
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api/v1";

console.log("🔧 API_URL:", API_URL);

// Main axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor - add token
axiosInstance.interceptors.request.use((config: any) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  console.log("🚀 Request:", config.method?.toUpperCase(), config.url);
  return config;
});

// Response interceptor - handle token refresh
axiosInstance.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await useAuthStore.getState().refreshToken();
        const { accessToken } = useAuthStore.getState();

        if (accessToken) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Public instance (no auth)
export const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export default axiosInstance;
