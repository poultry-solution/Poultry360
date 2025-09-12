"use client";
import { Toaster } from "sonner";

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Toaster position="bottom-right" richColors />
      {children}
    </>
  );
};
