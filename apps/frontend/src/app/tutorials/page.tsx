"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n/useI18n";
import { Play, Video } from "lucide-react";

// Mock data: replace drive IDs with real Google Drive file IDs when available
const TUTORIAL_SECTIONS = [
  {
    id: "getting-started",
    titleKey: "tutorials.sections.gettingStarted",
    videos: [
      {
        id: "v1",
        titleKey: "tutorials.videos.howToSignUp",
        descriptionKey: "tutorials.descriptions.howToSignUp",
        driveId: "1abc_mock_how_to_sign_up",
      },
      {
        id: "v2",
        titleKey: "tutorials.videos.howToCreateFarm",
        descriptionKey: "tutorials.descriptions.howToCreateFarm",
        driveId: "1abc_mock_how_to_create_farm",
      },
    ],
  },
  {
    id: "batch-management",
    titleKey: "tutorials.sections.batchManagement",
    videos: [
      {
        id: "v3",
        titleKey: "tutorials.videos.creatingBroilerBatch",
        descriptionKey: "tutorials.descriptions.creatingBroilerBatch",
        driveId: "1abc_mock_creating_broiler_batch",
      },
      {
        id: "v4",
        titleKey: "tutorials.videos.managingExpenses",
        descriptionKey: "tutorials.descriptions.managingExpenses",
        driveId: "1abc_mock_managing_expenses",
      },
    ],
  },
  {
    id: "sales-inventory",
    titleKey: "tutorials.sections.salesInventory",
    videos: [
      {
        id: "v5",
        titleKey: "tutorials.videos.recordingSales",
        descriptionKey: "tutorials.descriptions.recordingSales",
        driveId: "1abc_mock_recording_sales",
      },
      {
        id: "v6",
        titleKey: "tutorials.videos.inventoryBasics",
        descriptionKey: "tutorials.descriptions.inventoryBasics",
        driveId: "1abc_mock_inventory_basics",
      },
    ],
  },
  {
    id: "supplier-ledger",
    titleKey: "tutorials.sections.supplierLedger",
    videos: [
      {
        id: "v7",
        titleKey: "tutorials.videos.supplierLedgerOverview",
        descriptionKey: "tutorials.descriptions.supplierLedgerOverview",
        driveId: "1abc_mock_supplier_ledger",
      },
    ],
  },
];

function getDrivePreviewUrl(driveId: string) {
  return `https://drive.google.com/file/d/${driveId}/preview`;
}

function VideoCard({
  video,
  t,
  onClick,
}: {
  video: (typeof TUTORIAL_SECTIONS)[0]["videos"][0];
  t: (key: string) => string;
  onClick: () => void;
}) {
  return (
    <Card
      className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md border-gray-200"
      onClick={onClick}
    >
      <div className="aspect-video bg-muted flex items-center justify-center relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center text-white shadow-lg">
            <Play className="h-7 w-7 ml-1" fill="currentColor" />
          </div>
        </div>
        <Video className="h-12 w-12 text-muted-foreground/40" aria-hidden />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t(video.titleKey)}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {t(video.descriptionKey)}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function VideoPlayerModal({
  open,
  onClose,
  title,
  driveId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  driveId: string;
}) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const src = getDrivePreviewUrl(driveId);

  useEffect(() => {
    if (open) setIframeLoaded(false);
  }, [open, driveId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl w-[calc(100%-2rem)] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="relative px-6 pb-6">
          {!iframeLoaded && (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center animate-pulse">
              <div className="text-center text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading video...</p>
              </div>
            </div>
          )}
          <div
            className={`relative rounded-lg overflow-hidden bg-black ${!iframeLoaded ? "absolute opacity-0 pointer-events-none" : ""}`}
            style={{ aspectRatio: "16/9" }}
          >
            <iframe
              src={src}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TutorialsPage() {
  const { t } = useI18n();
  const [playerVideo, setPlayerVideo] = useState<{
    title: string;
    driveId: string;
  } | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-12 lg:py-16 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="text-center mb-12">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {t("tutorials.title")}
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {t("tutorials.subtitle")}
              </p>
            </div>

            <div className="space-y-14">
              {TUTORIAL_SECTIONS.map((section) => (
                <div key={section.id}>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    {t(section.titleKey)}
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {section.videos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        t={t}
                        onClick={() =>
                          setPlayerVideo({
                            title: t(video.titleKey),
                            driveId: video.driveId,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {playerVideo && (
        <VideoPlayerModal
          open={!!playerVideo}
          onClose={() => setPlayerVideo(null)}
          title={playerVideo.title}
          driveId={playerVideo.driveId}
        />
      )}
    </div>
  );
}
