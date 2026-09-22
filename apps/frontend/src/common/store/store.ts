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

export interface HatcheryBusiness {
  id: string;
  name: string;
  contact: string;
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
  role: "OWNER" | "MANAGER" | "DOCTOR" | "DEALER" | "COMPANY" | "HATCHERY" | "SUPER_ADMIN";
  status: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
  onboardingPayment?: {
    state:
      | "PENDING_PAYMENT"
      | "PENDING_REVIEW"
      | "PAYMENT_REJECTED"
      | "PAYMENT_APPROVED";
    lockedUntilApproved: boolean;
  } | null;
  language?: "ENGLISH" | "NEPALI";
  calendarType?: "AD" | "BS";
  managedFarms?: string[]; // Array of farm IDs for managers
  ownedFarms?: string[]; // Array of farm IDs for owners
  dealer?: DealerBusiness | null; // Dealer business info if user owns a dealer
  company?: CompanyBusiness | null; // Company business info if user owns a company
  hatchery?: HatcheryBusiness | null; // Hatchery business info if user owns a hatchery
  isStaff?: boolean;
  permissions?: StaffPermission[];
}

export type StaffPermission =
  | "DEALER_VIEW_FINANCIAL_SUMMARIES"
  | "DEALER_VIEW_CASH_HISTORY"
  | "DEALER_VIEW_STAFF_MANAGEMENT";

export interface LoginCredentials {
  emailOrPhone: string;
  password: string;
}

export interface RegisterData {
  name: string;
  password: string;
  phone: string;
  role: "OWNER" | "MANAGER" | "DOCTOR" | "DEALER" | "COMPANY" | "HATCHERY" | "SUPER_ADMIN";
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
  authMode: "user" | "staff" | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  staffLogin: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  validateToken: () => Promise<boolean>;
  getUserInfo: () => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
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
        authMode: null,

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
              onboardingPayment: user.onboardingPayment
                ? {
                    state: user.onboardingPayment.state,
                    lockedUntilApproved:
                      user.onboardingPayment.lockedUntilApproved,
                  }
                : null,
              language: user.language || "ENGLISH",
              calendarType: user.calendarType || "AD",
              managedFarms: user.managedFarms || [],
              ownedFarms: user.ownedFarms || [],
              dealer: user.dealer || null,
              company: user.company || null,
              hatchery: user.hatchery || null,
            };

            set({
              user: transformedUser,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
              authMode: "user",
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

        staffLogin: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null });
          try {
            const response = await apiCall("/staff-auth/login", {
              method: "POST",
              body: JSON.stringify(credentials),
            });
            const { accessToken, user } = response;
            set({
              user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: "DEALER",
                status: user.status || "ACTIVE",
                dealer: user.dealer || null,
                isStaff: true,
                permissions: user.permissions || [],
              },
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
              authMode: "staff",
            });
          } catch (error) {
            set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: error instanceof Error ? error.message : "Staff login failed", authMode: null });
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

            const { accessToken, user, onboarding } = response;

            // Transform user data to match our interface
            const transformedUser: User = {
              id: user.id,
              name: user.name,
              phone: user.phone,
              companyName: user.companyName,
              companyFarmLocation: user.companyFarmLocation,
              role: user.role,
              status: "ACTIVE", // New users are active by default
              onboardingPayment: onboarding
                ? {
                    state: onboarding.state,
                    lockedUntilApproved: true,
                  }
                : null,
              language: user.language || "ENGLISH",
              calendarType: user.calendarType || "AD",
              managedFarms: [],
              ownedFarms: user.ownedFarms || [],
              dealer: user.dealer || null,
              company: user.company || null,
              hatchery: user.hatchery || null,
            };

            set({
              user: transformedUser,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
              authMode: "user",
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
            const { accessToken, authMode } = get();
            await apiCall(authMode === "staff" ? "/staff-auth/logout" : "/auth/logout", {
              method: "POST",
              headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
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
              authMode: null,
            });

            // Clear localStorage
            localStorage.removeItem("auth-storage");
          }
        },

        refreshToken: async () => {
          try {
            const response = await apiCall(get().authMode === "staff" ? "/staff-auth/refresh-token" : "/auth/refresh-token", {
              method: "POST",
            });
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
            if (get().authMode === "staff") {
              const response = await apiCall("/staff-auth/validate", {
                method: "GET",
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (!response.isValid || !response.user) return false;
              set({
                user: {
                  id: response.user.id,
                  name: response.user.name,
                  phone: response.user.phone,
                  role: "DEALER",
                  status: response.user.status || "ACTIVE",
                  dealer: response.user.dealer || null,
                  isStaff: true,
                  permissions: response.user.permissions || [],
                },
                isAuthenticated: true,
                error: null,
              });
              return true;
            }
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
                onboardingPayment: response.user.onboardingPayment
                  ? {
                      state:
                        response.user.onboardingPayment.state as
                          | "PENDING_PAYMENT"
                          | "PENDING_REVIEW"
                          | "PAYMENT_REJECTED"
                          | "PAYMENT_APPROVED",
                      lockedUntilApproved:
                        response.user.onboardingPayment.lockedUntilApproved,
                    }
                  : null,
                language: response.user.language || "ENGLISH",
                calendarType: response.user.calendarType || "AD",
                managedFarms: response.user.managedFarms || [],
                ownedFarms: response.user.ownedFarms || [],
                dealer: response.user.dealer || null,
                company: response.user.company || null,
                hatchery: response.user.hatchery || null,
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
            if (get().authMode === "staff") {
              const userData = await apiCall("/staff-auth/@me", {
                method: "GET",
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              set({
                user: {
                  id: userData.id,
                  name: userData.name,
                  phone: userData.phone,
                  role: "DEALER",
                  status: userData.status || "ACTIVE",
                  dealer: userData.dealer || null,
                  isStaff: true,
                  permissions: userData.permissions || [],
                },
                error: null,
              });
              return;
            }
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
              hatchery: userData.hatchery || null,
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
              const isValid = await get().validateToken();
              if (isValid) {
                return;
              }
            }

            // Step 2: Access token missing or expired — try httpOnly cookie refresh
            const newAccessToken = await get().refreshToken();
            if (newAccessToken) {
              const isValid = await get().validateToken();
              if (isValid) {
                return;
              }
            }

            throw new Error("All authentication methods failed");
          } catch (error) {
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

  
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          isAuthenticated: state.isAuthenticated,
          authMode: state.authMode,
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
    staffLogin,
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
    staffLogin,
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
