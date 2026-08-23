import { AuthGuard } from "@/common/components/auth/AuthGuard";
import { RoleBasedMiddleware } from "@/common/components/auth/RoleBasedMiddleware";
import { PushNotificationInit } from "@/common/components/PushNotificationInit";
import { ChatProvider } from "@/common/contexts/ChatContext";
import { InventoryProvider } from "@/common/contexts/InventoryContext";
import { AuthProvider } from "@/common/providers/AuthProvider";
import { LoadingProvider } from "@/common/providers/LoadingProvider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <InventoryProvider>
        <ChatProvider>
          <LoadingProvider>
            <RoleBasedMiddleware>
              <AuthGuard requireAuth={true}>
                <PushNotificationInit />
                {children}
              </AuthGuard>
            </RoleBasedMiddleware>
          </LoadingProvider>
        </ChatProvider>
      </InventoryProvider>
    </AuthProvider>
  );
}
