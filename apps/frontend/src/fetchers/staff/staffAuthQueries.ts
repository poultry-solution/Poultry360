import { useMutation } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { useAuthStore } from "@/common/store/store";

// Staff self-serve: set a new password.
// - When mustChangePassword=true (first login or owner reset), currentPassword
//   can be omitted — the server will accept the new password directly.
// - Otherwise (voluntary change from the user menu), currentPassword is
//   required and verified server-side.
// The server rotates sessionVersion and returns a fresh accessToken so the
// current device stays signed in.
export function useChangeStaffPassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword?: string; newPassword: string }) => {
      const { data } = await axiosInstance.post<{ success: boolean; accessToken: string }>(
        "/staff-auth/change-password",
        input,
      );
      return data;
    },
    onSuccess: (data) => {
      if (data?.accessToken) {
        useAuthStore.getState().setAccessToken(data.accessToken);
      }
      const user = useAuthStore.getState().user;
      if (user) useAuthStore.getState().setUser({ ...user, mustChangePassword: false });
    },
  });
}

// "Keep current password" option from the first-login modal.
// Only meaningful when mustChangePassword=true; the server no-ops otherwise.
export function useAcknowledgeStaffPassword() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post<{ success: boolean }>(
        "/staff-auth/acknowledge-password",
      );
      return data;
    },
    onSuccess: () => {
      const user = useAuthStore.getState().user;
      if (user) useAuthStore.getState().setUser({ ...user, mustChangePassword: false });
    },
  });
}
