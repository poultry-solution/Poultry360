import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/common/providers/QueryProvider";
import { AuthGuard } from "@/common/components/auth/AuthGuard";
import { AuthProvider } from "@/common/providers/AuthProvider";
import { InventoryProvider } from "@/common/contexts/InventoryContext";
import { ToastProvider } from "@/common/providers/ToastProvider";
import { ChatProvider } from "@/common/contexts/ChatContext";
import { LoadingProvider } from "@/common/providers/LoadingProvider";
import { RoleBasedMiddleware } from "@/common/components/auth/RoleBasedMiddleware";
import { I18nProvider } from "@/i18n/I18nProvider";
import { PushNotificationInit } from "@/common/components/PushNotificationInit";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Poultry360 - Smart Poultry Management System",
  description:
    "Comprehensive poultry management system for Broiler farming. Track sales, manage expenses, control inventory & more. Start with Broiler, scale to Layers, Hatchery & Feed dealers.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Poultry360",
  },
  formatDetection: {
    telephone: false,
    email: false,
  },
  icons: {
    apple: "/icons/icon-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} antialiased`}
      >
        <I18nProvider>
          <AuthProvider>
            <QueryProvider>
              <InventoryProvider>
                <ChatProvider>
                  <ToastProvider>
                    <LoadingProvider>
                      <RoleBasedMiddleware>
                        <AuthGuard>
                          <PushNotificationInit />
                          {children}
                        </AuthGuard>
                      </RoleBasedMiddleware>
                    </LoadingProvider>
                  </ToastProvider>
                </ChatProvider>
              </InventoryProvider>
            </QueryProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
