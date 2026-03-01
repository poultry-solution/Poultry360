import { useMutation } from '@tanstack/react-query';

import axiosInstance from "../lib/axios" ;
export const usePasswordVerification = () => {
  return useMutation({
    mutationFn: async (password: string) => {
      const response = await axiosInstance.post('/auth/verify-password', { password });
      return response.data;
    },
  });
};

// Reusable hook for password-protected operations
export const usePasswordProtectedAction = <T extends any[]>(
  action: (...args: T) => Promise<any>
) => {
  const passwordVerification = usePasswordVerification();

  const executeWithPassword = async (password: string, ...args: T) => {
    // First verify password
    await passwordVerification.mutateAsync(password);

    // If password is valid, execute the action
    return action(...args);
  };

  return {
    executeWithPassword,
    isVerifying: passwordVerification.isPending,
    verificationError: passwordVerification.error,
  };
};
