/* eslint-disable @typescript-eslint/no-unused-vars */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { crossPortAuth } from "@myapp/shared-auth";

// Types based on your backend
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  companyFarmLocation?: string;
  companyFarmNumber?: string;
  companyFarmCapacity?: number;
  role: "OWNER" | "MANAGER" | "DOCTOR" | "SUPER_ADMIN";
  gender: "MALE" | "FEMALE" | "OTHER";
  status: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
  managedFarms?: string[]; // Array of farm IDs for managers
}

export interface LoginCredentials {
  emailOrPhone: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email?: string;
  password: string;
  phone?: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  role: "OWNER" | "MANAGER" | "DOCTOR" | "SUPER_ADMIN";
  companyName?: string;
  companyFarmLocation?: string;
  companyFarmNumber?: string;
  companyFarmCapacity?: number;
}

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  validateToken: () => Promise<boolean>;
  getUserInfo: () => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  testRefreshToken: () => Promise<any>;
  navigateToDoctorApp: () => void;
}

// API base URL - adjust according to your setup
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api/v1";

// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: "include", // Important for cookies
  };

  console.log(`🌐 API Call: ${config.method || 'GET'} ${url}`);
  console.log(`🍪 Cookies will be included: ${config.credentials === 'include'}`);

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    console.error(`❌ API Error: ${response.status} - ${errorData.message}`);
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isInitialized: false,

        // Actions
        login: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiCall("/auth/login", {
              method: "POST",
              body: JSON.stringify(credentials),
            });

            const { accessToken, user } = response;

            // Transform user data to match our interface
            const transformedUser: User = {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              companyName: user.companyName,
              companyFarmLocation: user.companyFarmLocation,
              companyFarmNumber: user.companyFarmNumber,
              companyFarmCapacity: user.companyFarmCapacity,
              role: user.role,
              gender: user.gender || "OTHER",
              status: user.status || "ACTIVE",
              managedFarms: user.managedFarms || [],
            };

            set({
              user: transformedUser,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: error instanceof Error ? error.message : "Login failed",
            });
            throw error;
          }
        },

        register: async (data: RegisterData) => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiCall("/auth/register", {
              method: "POST",
              body: JSON.stringify(data),
            });

            const { accessToken, user } = response;

            // Transform user data to match our interface
            const transformedUser: User = {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              companyName: user.companyName,
              companyFarmLocation: user.companyFarmLocation,
              companyFarmNumber: user.companyFarmNumber,
              companyFarmCapacity: user.companyFarmCapacity,
              role: user.role,
              gender: data.gender,
              status: "ACTIVE", // New users are active by default
              managedFarms: [],
            };

            set({
              user: transformedUser,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              isLoading: false,
              error:
                error instanceof Error ? error.message : "Registration failed",
            });
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true });

          try {
            await apiCall("/auth/logout", {
              method: "POST",
            });
          } catch (error) {
            console.error("Logout error:", error);
          } finally {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });

            // Clear localStorage
            localStorage.removeItem("auth-storage");
          }
        },

        refreshToken: async () => {
          try {
            const response = await apiCall("/auth/refresh-token", {
              method: "POST",
            });
            console.log("🔄 Refresh token response:", response);

            const { accessToken } = response;

            set({
              accessToken,
              isAuthenticated: true,
              error: null,
            });

            return accessToken;
          } catch (error) {
            // If refresh fails, logout user
            console.error("❌ Refresh token error:", error);
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              error: null,
            });
            localStorage.removeItem("auth-storage");
            throw error;
          }
        },

        validateToken: async (): Promise<boolean> => {
          const { accessToken } = get();

          if (!accessToken) {
            return false;
          }

          try {
            const response = await apiCall("/auth/validate", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (response.isValid && response.user) {
              // Transform user data to match our interface
              const transformedUser: User = {
                id: response.user.id,
                name: response.user.name,
                email: response.user.email,
                phone: response.user.phone,
                companyName: response.user.companyName,
                companyFarmLocation: response.user.companyFarmLocation,
                companyFarmNumber: response.user.companyFarmNumber,
                companyFarmCapacity: response.user.companyFarmCapacity,
                role: response.user.role,
                gender: response.user.gender || "OTHER",
                status: response.user.status || "ACTIVE",
                managedFarms: response.user.managedFarms || [],
              };

              set({
                user: transformedUser,
                isAuthenticated: true,
                error: null,
              });
              return true;
            } else {
              set({
                user: null,
                accessToken: null,
                isAuthenticated: false,
                error: null,
              });
              return false;
            }
          } catch (error) {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              error: null,
            });
            return false;
          }
        },
        getUserInfo: async () => {
          const { accessToken } = get();

          if (!accessToken) {
            throw new Error("No access token available");
          }

          try {
            const userData = await apiCall("/auth/@me", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            // Transform user data to match our interface
            const transformedUser: User = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              phone: userData.phone,
              companyName: userData.companyName,
              companyFarmLocation: userData.companyFarmLocation,
              companyFarmNumber: userData.companyFarmNumber,
              companyFarmCapacity: userData.companyFarmCapacity,
              role: userData.role,
              gender: userData.gender || "OTHER",
              status: userData.status || "ACTIVE",
              managedFarms: userData.managedFarms || [],
            };

            set({
              user: transformedUser,
              error: null,
            });
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to get user info",
            });
            throw error;
          }
        },

        clearError: () => {
          set({ error: null });
        },

        initialize: async () => {
          if (get().isInitialized) return;

          // Set loading during initialization
          set({ isLoading: true });

          try {
            console.log("🔄 Initializing auth - attempting token refresh...");
            
            // Always try to refresh the token first (uses httpOnly cookie)
            // This handles cases where access token is expired but refresh token is valid
            const newAccessToken = await get().refreshToken();
            
            if (newAccessToken) {
              // If refresh successful, validate the new token
              const isValid = await get().validateToken();
              
              if (isValid) {
                console.log("✅ Auth initialized successfully with valid token");
              } else {
                throw new Error("Token validation failed after refresh");
              }
            } else {
              throw new Error("Token refresh failed");
            }
          } catch (error) {
            console.log("❌ Auth initialization failed:", error);
            // If refresh fails, clear any stored data and mark as unauthenticated
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              error: null,
            });
            
            // Clear localStorage
            localStorage.removeItem("auth-storage");
          } finally {
            set({
              isLoading: false,
              isInitialized: true,
            });
          }
        },

        setUser: (user: User) => {
          set({ user });
        },

        setAccessToken: (token: string) => {
          set({ accessToken: token });
        },

        // Debug function to test refresh token
        testRefreshToken: async () => {
          try {
            console.log("🧪 Testing refresh token...");
            const response = await apiCall("/auth/refresh-token", {
              method: "POST",
            });
            console.log("🧪 Refresh token test response:", response);
            return response;
          } catch (error) {
            console.error("🧪 Refresh token test failed:", error);
            throw error;
          }
        },

        // Navigate to doctor app with auth data
        navigateToDoctorApp: () => {
          const { user, accessToken } = get();
          if (!user || !accessToken) {
            console.error("No auth data available for navigation");
            return;
          }

          // Store auth data in shared storage
          crossPortAuth.setAuthData({
            accessToken,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role,
              companyName: user.companyName,
            },
          });

          // Navigate to doctor app
          crossPortAuth.navigateToDoctorApp();
        },
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: "auth-store",
    }
  )
);

// Helper hooks for common use cases
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
};

export const useUser = () => {
  const user = useAuthStore((state) => state.user);
  return user;
};

export const useIsAuthenticated = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated;
};

// Token refresh interceptor utility
export const createAuthenticatedRequest = () => {
  const { accessToken, refreshToken } = useAuthStore.getState();

  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const makeRequest = (token?: string) => {
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      };

      return fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    };

    // Try the request with current token
    let response = await makeRequest(accessToken || undefined);

    // If unauthorized and we have a token, try to refresh
    if (response.status === 401 && accessToken) {
      try {
        await refreshToken();
        const newToken = useAuthStore.getState().accessToken;
        response = await makeRequest(newToken || undefined);
      } catch (error) {
        // Refresh failed, redirect to login or handle as needed
        useAuthStore.getState().logout();
        throw new Error("Session expired");
      }
    }

    return response;
  };
};
