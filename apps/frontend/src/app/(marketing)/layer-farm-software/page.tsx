import type { Metadata } from "next";
import ModuleSeoPage from "@/components/landing/ModuleSeoPage";
import { buildModuleMetadata, modulePageContent } from "@/content/modulePages";

const content = modulePageContent.layer;

export const metadata: Metadata = buildModuleMetadata(content);

export default function LayerFarmSoftwarePage() {
  return <ModuleSeoPage content={content} />;
}
