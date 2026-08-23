import type { Metadata } from "next";
import ModuleSeoPage from "@/components/landing/ModuleSeoPage";
import { buildModuleMetadata, modulePageContent } from "@/content/modulePages";

const content = modulePageContent.hatchery;

export const metadata: Metadata = buildModuleMetadata(content);

export default function HatcherySoftwarePage() {
  return <ModuleSeoPage content={content} />;
}
