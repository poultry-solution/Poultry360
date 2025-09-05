/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/store";

// ==================== API URL ====================
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api/v1";

console.log("🔧 API_URL:", API_URL);

// ==================== MAIN AXIOS INSTANCE ====================
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ==================== REQUEST INTERCEPTOR ====================
axiosInstance.interceptors.request.use((config: any) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  console.log("🚀 Request:", config.method?.toUpperCase(), config.url);
  return config;
});

// ==================== RESPONSE INTERCEPTOR ====================
axiosInstance.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const originalRequest = error.config;

    // --- Handle 401 token refresh ---
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

    // --- Normalize and toast error ---
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong. Please try again.";

    toast.error(message);

    return Promise.reject(error);
  }
);

// ==================== PUBLIC API (NO AUTH) ====================
export const publicApi = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ==================== EXPORT ====================
export default axiosInstance;
