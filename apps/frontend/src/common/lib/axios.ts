/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/common/store/store";

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

  // Skip ngrok's browser warning page so the request reaches our backend (avoids CORS * from ngrok)
  if (typeof window !== "undefined" && API_URL.includes("ngrok")) {
    config.headers["ngrok-skip-browser-warning"] = "true";
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

      console.log("🔄 Token expired, attempting refresh...");

      try {
        const newAccessToken = await useAuthStore.getState().refreshToken();
        
        if (newAccessToken) {
          console.log("✅ Token refreshed successfully");
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        } else {
          throw new Error("No access token received from refresh");
        }
      } catch (refreshError) {
        console.log("❌ Token refresh failed, logging out...", refreshError);
        useAuthStore.getState().logout();
        // Only redirect if we're not already on the login page
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) {
          window.location.href = "/auth/login";
        }
        return Promise.reject(refreshError);
      }
    }

    // --- Normalize and toast error ---
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong. Please try again.";

    // Don't show toast for 401 errors (handled above)
    if (error.response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// ==================== PUBLIC API (NO AUTH) ====================
export const publicApi = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

publicApi.interceptors.request.use((config: any) => {
  if (typeof window !== "undefined" && API_URL.includes("ngrok")) {
    config.headers["ngrok-skip-browser-warning"] = "true";
  }
  return config;
});

// ==================== EXPORT ====================
export default axiosInstance;
