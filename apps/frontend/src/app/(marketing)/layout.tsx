import { PublicRouteAuthRedirect } from "@/common/components/auth/PublicRouteAuthRedirect";
import { AuthProvider } from "@/common/providers/AuthProvider";
import Script from "next/script";

const siteUrl = "https://www.poultry360.org";

const marketingJsonLd = {
  "@context": "https://schema.org",
  "@type": ["SoftwareApplication", "WebApplication"],
  "@id": `${siteUrl}/#software`,
  name: "Poultry360",
  url: siteUrl,
  description:
    "Poultry management software for broiler and layer farmers, feed dealers, feed mills, hatcheries, and veterinary businesses in Nepal.",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Poultry Farm Management Software",
  operatingSystem: "Web",
  browserRequirements: "Requires a modern web browser and internet connection.",
  countriesSupported: "NP",
  featureList: [
    "Broiler farm management",
    "Layer farm management",
    "Batch management",
    "Sales management",
    "Expense management",
    "Inventory management",
    "Mortality tracking",
    "Feed management",
    "FCR evaluation",
    "Egg production tracking",
  ],
  audience: {
    "@type": "Audience",
    audienceType: "Poultry farmers and poultry businesses in Nepal",
  },
  offers: {
    "@type": "Offer",
    price: 0,
    priceCurrency: "NPR",
    availability: "https://schema.org/InStock",
    url: siteUrl,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider blockWhileInitializing={false}>
      <Script id="microsoft-clarity" strategy="afterInteractive">
        {`(function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "y6yivgtmfp");`}
      </Script>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketingJsonLd) }}
      />
      <PublicRouteAuthRedirect />
      {children}
    </AuthProvider>
  );
}
