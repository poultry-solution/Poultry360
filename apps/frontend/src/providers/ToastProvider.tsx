"use client";
import { Toaster } from "sonner";

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Toaster position="top-right" richColors />
      {children}
    </>
  );
};
