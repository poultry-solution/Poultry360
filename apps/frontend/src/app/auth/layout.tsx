import { PublicRouteAuthRedirect } from "@/common/components/auth/PublicRouteAuthRedirect";
import { AuthProvider } from "@/common/providers/AuthProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider blockWhileInitializing={false}>
      <PublicRouteAuthRedirect />
      {children}
    </AuthProvider>
  );
}
