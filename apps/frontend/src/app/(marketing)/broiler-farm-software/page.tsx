import type { Metadata } from "next";
import ModuleSeoPage from "@/components/landing/ModuleSeoPage";
import { buildModuleMetadata, modulePageContent } from "@/content/modulePages";

const content = modulePageContent.broiler;

export const metadata: Metadata = buildModuleMetadata(content);

export default function BroilerFarmSoftwarePage() {
  return <ModuleSeoPage content={content} />;
}
