import type { Metadata } from "next";
import ModuleSeoPage from "@/components/landing/ModuleSeoPage";
import { buildModuleMetadata, modulePageContent } from "@/content/modulePages";

const content = modulePageContent.dealer;

export const metadata: Metadata = buildModuleMetadata(content);

export default function FeedDealerSoftwarePage() {
  return <ModuleSeoPage content={content} />;
}
