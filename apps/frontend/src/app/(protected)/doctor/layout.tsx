"use client";

import { AuthGuard } from "@/common/components/auth/AuthGuard";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["DOCTOR"]}>
      {children}
    </AuthGuard>
  );
}
