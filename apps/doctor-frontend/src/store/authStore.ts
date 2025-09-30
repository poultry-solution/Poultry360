import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { crossPortAuth, AuthData } from "@myapp/shared-auth";

// Types based on your backend
export interface User {
  id: string;
  name: string;
  phone: string;
  companyName?: string;
  companyFarmLocation?: string;
  role: "OWNER" | "MANAGER" | "DOCTOR";
  status: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
  managedFarms?: string[];
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
  initialize: () => Promise<void>;
  setAuthFromShared: (authData: AuthData) => void;
  refreshToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  navigateToMainApp: () => void;
  clearError: () => void;
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
    credentials: "include",
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
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
        initialize: async () => {
          if (get().isInitialized) return;

          set({ isLoading: true });

          try {
            // First, try to get auth data from URL (cross-port navigation)
            console.log("🔍 Checking for auth data from URL...");
            const authFromUrl = await crossPortAuth.handleAuthFromUrl();

            if (authFromUrl) {
              console.log("✅ Got auth data from URL:", authFromUrl);
              get().setAuthFromShared(authFromUrl);
              set({ isInitialized: true, isLoading: false });
              return;
            } else {
              console.log("❌ No auth data found in URL");
            }

            // Then try to get from shared storage
            console.log("🔍 Checking for auth data from shared storage...");
            const sharedAuth = crossPortAuth.getAuthData();

            if (sharedAuth) {
              console.log("✅ Got auth data from shared storage:", sharedAuth);
              get().setAuthFromShared(sharedAuth);
              set({ isInitialized: true, isLoading: false });
              return;
            } else {
              console.log("❌ No auth data found in shared storage");
            }

            // If no shared auth, try to validate with backend using cookies
            console.log("🔍 Attempting to validate with backend...");
            try {
              const response = await apiCall("/auth/refresh-token", {
                method: "POST",
              });

              if (response.accessToken) {
                // Validate the token
                const validationResponse = await apiCall("/auth/validate", {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${response.accessToken}`,
                  },
                });

                if (validationResponse.isValid && validationResponse.user) {
                  const transformedUser: User = {
                    id: validationResponse.user.id,
                    name: validationResponse.user.name,
                    phone: validationResponse.user.phone,
                    companyName: validationResponse.user.companyName,
                    companyFarmLocation:
                      validationResponse.user.companyFarmLocation,
                    role: validationResponse.user.role,
                    status: validationResponse.user.status || "ACTIVE",
                    managedFarms: validationResponse.user.managedFarms || [],
                  };

                  console.log("✅ Transformed user:", transformedUser);

                  set({
                    user: transformedUser,
                    accessToken: response.accessToken,
                    isAuthenticated: true,
                    error: null,
                  });

                  // Store in shared storage for future use
                  crossPortAuth.setAuthData({
                    accessToken: response.accessToken,
                    user: {
                      id: transformedUser.id,
                      name: transformedUser.name,
                      phone: transformedUser.phone,
                      role: transformedUser.role,
                      companyName: transformedUser.companyName,
                    },
                  });
                }
              }
            } catch (error) {
              console.log("❌ No valid session found, redirecting to main app");
              // If no valid session, redirect to main app login
              if (typeof window !== "undefined") {
                setTimeout(() => {
                  window.location.href = "http://localhost:3000/auth/login";
                }, 1000);
              }
            }

            set({ isInitialized: true, isLoading: false });
          } catch (error) {
            console.error("❌ Auth initialization failed:", error);
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              error: null,
              isInitialized: true,
              isLoading: false,
            });
            
            // Redirect to main app login on auth failure
            if (typeof window !== "undefined") {
              setTimeout(() => {
                window.location.href = "http://localhost:3000/auth/login";
              }, 1000);
            }
          }
        },

        setAuthFromShared: (authData: AuthData) => {
          const transformedUser: User = {
            id: authData.user.id,
            name: authData.user.name,
            phone: authData.user.phone,
            companyName: authData.user.companyName,
            role: authData.user.role as any,
            status: "ACTIVE", // Default value
            managedFarms: [],
          };

          set({
            user: transformedUser,
            accessToken: authData.accessToken,
            isAuthenticated: true,
            error: null,
          });
        },

        refreshToken: async () => {
          try {
            const response = await apiCall("/auth/refresh-token", {
              method: "POST",
            });

            if (response.accessToken) {
              set({ accessToken: response.accessToken });
              
              // Update shared storage
              const currentAuth = crossPortAuth.getAuthData();
              if (currentAuth) {
                crossPortAuth.setAuthData({
                  ...currentAuth,
                  accessToken: response.accessToken,
                });
              }
              
              return response.accessToken;
            }
            return null;
          } catch (error) {
            console.error("Token refresh failed:", error);
            return null;
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

            // Clear shared storage
            crossPortAuth.clearAuthData();
            localStorage.removeItem("auth-storage");
          }
        },

        navigateToMainApp: () => {
          crossPortAuth.navigateToMainApp();
        },

        clearError: () => {
          set({ error: null });
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

// Helper hooks
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    logout,
    navigateToMainApp,
    clearError,
  } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    logout,
    navigateToMainApp,
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
