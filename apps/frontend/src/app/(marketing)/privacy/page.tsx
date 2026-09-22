import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacy | Poultry360",
  description: "How Poultry360 handles sign-in security information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 sm:py-16">
        <div><h1 className="text-3xl font-bold">Privacy</h1><p className="mt-3 text-slate-600">We collect only the information needed to keep accounts safe and run Poultry360.</p></div>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Sign-in security</h2><p>When you sign in, we keep your IP address and basic device details: browser type, operating system, and whether you used a phone, tablet, or computer. If our trusted hosting service provides it, we may also keep an estimated country or region.</p><p>We do not collect your exact location, browser history, device ID, passwords, tokens, or the full browser identifier.</p></section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Who can see it</h2><p>This sign-in security information is visible only to Poultry360 Super Admin for account security and misuse investigation. It is not shown to farmers, dealers, business owners, or staff.</p></section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">How long we keep it</h2><p>Sign-in security information is automatically deleted after 30 days. The basic record that a sign-in happened remains in our protected audit history.</p></section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Questions</h2><p>For privacy questions, please contact Poultry360 through the contact page.</p></section>
      </main>
      <Footer />
    </div>
  );
}
