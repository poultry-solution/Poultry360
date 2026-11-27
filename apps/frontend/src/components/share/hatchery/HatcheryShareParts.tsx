"use client";

import type { ReactNode } from "react";
import { Bird, Link2Off, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { DateDisplay } from "@/common/components/ui/date-display";

// Small layout pieces for the public hatchery share pages (English only,
// mobile first). Same look as the farmer share page (SharedBatchReport.tsx).

export const fmt = (value: number | null | undefined, digits = 0) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: digits });

export const fmtPct = (value: number | null | undefined) => (value == null ? "—" : `${fmt(value, 1)}%`);

export function Tile({
  label,
  value,
  sub,
  valueClass = "",
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Section({ icon: Icon, title, children }: { icon: typeof Bird; title: string; children: ReactNode }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4">{children}</CardContent>
    </Card>
  );
}

/** A label + value line, used in small lists. */
export function Row({ label, value, valueClass = "" }: { label: ReactNode; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-2.5">
          <p className="font-semibold leading-tight">Poultry360</p>
          <p className="text-xs text-muted-foreground">Hatchery batch report</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </div>
  );
}

export function LoadingState() {
  return (
    <Shell>
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin" />
        <p className="text-sm">Loading report…</p>
      </div>
    </Shell>
  );
}

/** 404 → "link ended"; 429 → too many views; anything else → try again. */
export function ProblemState({ status }: { status?: number }) {
  const ended = !status || status === 404;
  return (
    <Shell>
      <Card className="mx-auto mt-12 max-w-md">
        <CardContent className="space-y-3 pt-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Link2Off className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">{ended ? "This link has ended" : "Could not load the report"}</p>
          <p className="text-sm text-muted-foreground">
            {ended
              ? "The link was turned off or its time is over. Ask the hatchery to send a new link."
              : status === 429
                ? "Too many views from this network. Please wait a minute and try again."
                : "Please check your internet and try again."}
          </p>
        </CardContent>
      </Card>
    </Shell>
  );
}

export function NotesList({
  notes,
}: {
  notes: { legacy: string | null; items: Array<{ text: string; date: string; author: string }> };
}) {
  if (!notes.legacy && notes.items.length === 0) return <Empty>No notes yet.</Empty>;
  return (
    <ul className="space-y-2">
      {notes.items.map((note, i) => (
        <li key={i} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <p className="whitespace-pre-wrap break-words">{note.text}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {note.author} · <DateDisplay date={note.date} />
          </p>
        </li>
      ))}
      {notes.legacy && (
        <li className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <p className="whitespace-pre-wrap break-words">{notes.legacy}</p>
          <p className="mt-1 text-xs text-muted-foreground">Batch note</p>
        </li>
      )}
    </ul>
  );
}
