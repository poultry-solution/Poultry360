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

const TUTORIAL_SECTIONS = [
  {
    id: "getting-started",
    titleKey: "tutorials.sections.gettingStarted",
    videos: [
      {
        id: "v1",
        titleKey: "tutorials.videos.introductionToPoultry360",
        descriptionKey: "tutorials.descriptions.introductionToPoultry360",
        driveId: "1ri-vh6GZzSSE8FqSOmFX1hKhrt6RiS_L",
      },
    ],
  },
  {
    id: "broiler-layer-farmer",
    titleKey: "tutorials.sections.broilerLayerFarmer",
    videos: [
      {
        id: "v2",
        titleKey: "tutorials.videos.farmerManualEndToEnd",
        descriptionKey: "tutorials.descriptions.farmerManualEndToEnd",
        driveId: "1fmv8zMMEkhUE15m6R5rggatDc4ZQGnQT",
      },
      {
        id: "v3",
        titleKey: "tutorials.videos.farmerWithConnectionToDealer",
        descriptionKey: "tutorials.descriptions.farmerWithConnectionToDealer",
        driveId: "14vU--hq2EJ-p4Bm7me1eZYqQ3I1ib1Ve",
      },
      {
        id: "v4",
        titleKey: "tutorials.videos.layerFarmerIndepth",
        descriptionKey: "tutorials.descriptions.layerFarmerIndepth",
        driveId: "1AQtPTopeDWx-_5mKVCIxCNvvOqak98cJ",
      },
    ],
  },
  {
    id: "feed-supplier",
    titleKey: "tutorials.sections.feedSupplier",
    videos: [
      {
        id: "v5",
        titleKey: "tutorials.videos.feedSupplierEndToEnd",
        descriptionKey: "tutorials.descriptions.feedSupplierEndToEnd",
        driveId: "1ladQjgsCJruXzceGVNF6noqPzBXALN4U",
      },
      {
        id: "v6",
        titleKey: "tutorials.videos.feedSupplierWithConnectionToFarmer",
        descriptionKey: "tutorials.descriptions.feedSupplierWithConnectionToFarmer",
        driveId: "10f9SSUBSHKsz-g0AAjzFFmQpM8xFqrh3",
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
