import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { AuthProvider } from "@/providers/AuthProvider";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { ToastProvider } from "@/providers/ToastProvider";
import { ChatProvider } from "@/contexts/ChatContext";
import { LoadingProvider } from "@/providers/LoadingProvider";
import { RoleBasedMiddleware } from "@/components/RoleBasedMiddleware";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poultry360 - Smart Poultry Management System",
  description:
    "Comprehensive poultry management system for Broiler farming. Track sales, manage expenses, control inventory & more. Start with Broiler, scale to Layers, Hatchery & Feed dealers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <QueryProvider>
            <InventoryProvider>
              <ChatProvider>
                <ToastProvider>
                  <LoadingProvider>
                    <RoleBasedMiddleware>
                      <AuthGuard>
                        <ServiceWorkerRegistration />
                        {children}
                      </AuthGuard>
                    </RoleBasedMiddleware>
                  </LoadingProvider>
                </ToastProvider>
              </ChatProvider>
            </InventoryProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
