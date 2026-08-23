import { Suspense } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Badge } from "@/common/components/ui/badge";
import { Tag, Loader2 } from "lucide-react";
import { MarketplaceClientContent } from "@/components/marketing/MarketplaceClientContent";

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-12 lg:py-16 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="text-center mb-10">
              <Badge className="bg-primary/10 text-primary px-3 py-1 rounded-full mb-4 inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                Poultry Marketplace
              </Badge>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Live Poultry Listings Across Nepal
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Browse public poultry listings from farmers and businesses on Poultry360. Explore chickens, eggs,
                and layers for sale without signing in.
              </p>
            </div>
            <Suspense
              fallback={
                <div className="flex justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              }
            >
              <MarketplaceClientContent />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
