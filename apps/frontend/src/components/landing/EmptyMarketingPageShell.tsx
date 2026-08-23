import type { ReactNode } from "react";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";

export default function EmptyMarketingPageShell({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
