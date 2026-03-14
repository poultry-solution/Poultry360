/* eslint-disable @typescript-eslint/no-unused-vars */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";

// Types based on your backend
export interface DealerBusiness {
  id: string;
  name: string;
  contact: string;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  ownerId: string;
  companyId?: string | null;
}

export interface CompanyBusiness {
  id: string;
  name: string;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  companyName?: string;
  companyFarmLocation?: string;
  role: "OWNER" | "MANAGER" | "DOCTOR" | "DEALER" | "COMPANY" | "SUPER_ADMIN";
  status: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
  language?: "ENGLISH" | "NEPALI";
  calendarType?: "AD" | "BS";
  managedFarms?: string[]; // Array of farm IDs for managers
  ownedFarms?: string[]; // Array of farm IDs for owners
  dealer?: DealerBusiness | null; // Dealer business info if user owns a dealer
  company?: CompanyBusiness | null; // Company business info if user owns a company
}

export interface LoginCredentials {
  emailOrPhone: string;
  password: string;
}

export interface RegisterData {
  name: string;
  password: string;
  phone: string;
  role: "OWNER" | "MANAGER" | "DOCTOR" | "DEALER" | "COMPANY" | "SUPER_ADMIN";
  companyName?: string;
  companyFarmLocation?: string;
  language?: "ENGLISH" | "NEPALI";
  calendarType?: "AD" | "BS";
  dealerId?: string; // Optional dealer linking for farmers
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
  // navigateToDoctorApp: () => void; // TODO: Implement when unified architecture is ready
}

// API base URL - adjust according to your setup
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api/v1";

// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Bypass ngrok's browser warning page so fetch requests reach the backend
  if (API_BASE_URL.includes("ngrok")) {
    defaultHeaders["ngrok-skip-browser-warning"] = "true";
  }

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
              phone: user.phone,
              companyName: user.companyName,
              companyFarmLocation: user.companyFarmLocation,
              role: user.role,
              status: user.status || "ACTIVE",
              language: user.language || "ENGLISH",
              calendarType: user.calendarType || "AD",
              managedFarms: user.managedFarms || [],
              ownedFarms: user.ownedFarms || [],
              dealer: user.dealer || null,
              company: user.company || null,
            };

            set({
              user: transformedUser,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
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
              phone: user.phone,
              companyName: user.companyName,
              companyFarmLocation: user.companyFarmLocation,
              role: user.role,
              status: "ACTIVE", // New users are active by default
              language: user.language || "ENGLISH",
              calendarType: user.calendarType || "AD",
              managedFarms: [],
              ownedFarms: user.ownedFarms || [],
              dealer: user.dealer || null,
              company: user.company || null,
            };

            set({
              user: transformedUser,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
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
            console.error("❌ Refresh token error:", error);
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
              const transformedUser: User = {
                id: response.user.id,
                name: response.user.name,
                phone: response.user.phone,
                companyName: response.user.companyName,
                companyFarmLocation: response.user.companyFarmLocation,
                role: response.user.role,
                status: response.user.status || "ACTIVE",
                language: response.user.language || "ENGLISH",
                calendarType: response.user.calendarType || "AD",
                managedFarms: response.user.managedFarms || [],
                ownedFarms: response.user.ownedFarms || [],
                dealer: response.user.dealer || null,
                company: response.user.company || null,
              };

              set({
                user: transformedUser,
                isAuthenticated: true,
                error: null,
              });
              return true;
            }
            return false;
          } catch (error) {
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
              phone: userData.phone,
              companyName: userData.companyName,
              companyFarmLocation: userData.companyFarmLocation,
              role: userData.role,
              status: userData.status || "ACTIVE",
              language: userData.language || "ENGLISH",
              calendarType: userData.calendarType || "AD",
              managedFarms: userData.managedFarms || [],
              ownedFarms: userData.ownedFarms || [],
              dealer: userData.dealer || null,
              company: userData.company || null,
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

          set({ isLoading: true });

          try {
            // Step 1: Check if we have a persisted access token (from localStorage via zustand persist)
            const { accessToken } = get();

            if (accessToken) {
              console.log("🔄 Found persisted access token, validating...");
              const isValid = await get().validateToken();
              if (isValid) {
                console.log("✅ Persisted access token is valid");
                return;
              }
              console.log("⚠️ Persisted access token expired, trying cookie refresh...");
            }

            // Step 2: Access token missing or expired — try httpOnly cookie refresh
            const newAccessToken = await get().refreshToken();
            if (newAccessToken) {
              const isValid = await get().validateToken();
              if (isValid) {
                console.log("✅ Auth initialized via refresh token cookie");
                return;
              }
            }

            throw new Error("All authentication methods failed");
          } catch (error) {
            console.log("❌ Auth initialization failed:", error);
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              error: null,
            });
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
