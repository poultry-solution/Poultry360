"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { cn } from "@/common/lib/utils";
import {
  tutorialsByModule,
  wistiaIdFor,
  type Tutorial,
  type TutorialModule,
} from "@/content/tutorials";
import { WistiaPlayer } from "@/components/tutorials/WistiaPlayer";

function TutorialPlayer({ video }: { video: Tutorial }) {
  const mediaId = wistiaIdFor(video.key);

  if (!mediaId) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 text-center text-white">
        <PlayCircle className="h-10 w-10 opacity-60" />
        <p className="text-sm font-medium">This video is coming soon.</p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <WistiaPlayer mediaId={mediaId} />
    </div>
  );
}

export function TutorialsPage({ module }: { module: TutorialModule }) {
  const sections = tutorialsByModule[module];
  const [sectionId, setSectionId] = useState(sections[0].id);
  const section = sections.find((s) => s.id === sectionId) ?? sections[0];
  const [selectedKey, setSelectedKey] = useState(section.videos[0].key);
  const [watched, setWatched] = useState<Set<string>>(() => new Set<string>());

  useEffect(() => {
    try {
      setWatched(new Set<string>(JSON.parse(localStorage.getItem("p360-tutorials-watched") || "[]")));
    } catch {
      // Storage blocked: just start with nothing marked as watched.
    }
  }, []);

  const selected = useMemo(
    () => section.videos.find((v) => v.key === selectedKey) ?? section.videos[0],
    [section, selectedKey],
  );
  const selectedIndex = section.videos.indexOf(selected);

  const openSection = (id: string) => {
    const next = sections.find((s) => s.id === id);
    if (!next) return;
    setSectionId(id);
    setSelectedKey(next.videos[0].key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openVideo = (video: Tutorial) => {
    setSelectedKey(video.key);
    setWatched((prev) => {
      const next = new Set(prev);
      next.add(video.key);
      try {
        localStorage.setItem("p360-tutorials-watched", JSON.stringify([...next]));
      } catch {
        // Saving "watched" is only a help; ignore if storage is blocked.
      }
      return next;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tutorials</h1>
        <p className="mt-1 text-sm text-gray-600">
          Short videos that show how to use the app, step by step.
        </p>
      </div>

      {sections.length > 1 && (
        <div className="flex gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openSection(s.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                s.id === section.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <TutorialPlayer video={selected} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {section.title} · Video {selectedIndex + 1} of {section.videos.length}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">{selected.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{selected.description}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          {section.description && (
            <p className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600">{section.description}</p>
          )}
          <ol className="max-h-[70vh] divide-y divide-gray-100 overflow-y-auto">
            {section.videos.map((video, i) => {
              const active = video.key === selected.key;
              return (
                <li key={video.key}>
                  <button
                    type="button"
                    onClick={() => openVideo(video)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                      active ? "bg-primary/10" : "hover:bg-gray-50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        active ? "bg-primary text-primary-foreground" : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900">{video.title}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                        {video.length && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {video.length}
                          </span>
                        )}
                        {watched.has(video.key) && (
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Watched
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
