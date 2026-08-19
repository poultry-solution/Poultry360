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
import { NumberInputWheelGuard } from "@/common/components/NumberInputWheelGuard";

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

const siteUrl = "https://poultry360.org";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Poultry360",
  "url": siteUrl,
  "description": "Web-based poultry management software for Broiler farming in Nepal. Track sales, expenses, inventory & more.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "audience": {
    "@type": "Audience",
    "audienceType": "Poultry Farmers in Nepal"
  },
  "featureList": "Sales Tracking, Expense Management, Inventory Control, Broiler Growth Analysis"
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    icon: "/icons/final-icon.png",
    apple: "/icons/final-icon.png",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        <I18nProvider>
          <AuthProvider>
            <QueryProvider>
              <InventoryProvider>
                <ChatProvider>
                  <ToastProvider>
                    <LoadingProvider>
                      <RoleBasedMiddleware>
                        <AuthGuard>
                          <NumberInputWheelGuard />
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
