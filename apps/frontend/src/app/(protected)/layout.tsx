import { AuthGuard } from "@/common/components/auth/AuthGuard";
import { RoleBasedMiddleware } from "@/common/components/auth/RoleBasedMiddleware";
import { PushNotificationInit } from "@/common/components/PushNotificationInit";
import { InventoryProvider } from "@/common/contexts/InventoryContext";
import { AuthProvider } from "@/common/providers/AuthProvider";
import { LoadingProvider } from "@/common/providers/LoadingProvider";
import { StaffPasswordPrompt } from "@/components/staff/StaffPasswordPrompt";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <InventoryProvider>
        <LoadingProvider>
          <RoleBasedMiddleware>
            <AuthGuard requireAuth={true}>
              <PushNotificationInit />
              <StaffPasswordPrompt />
              {children}
            </AuthGuard>
          </RoleBasedMiddleware>
        </LoadingProvider>
      </InventoryProvider>
    </AuthProvider>
  );
}
