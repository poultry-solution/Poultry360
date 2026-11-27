"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Clock, Egg, FlaskConical, NotebookPen, Sun } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  useHatcheryShareIncubation,
  type HatcheryShareIncubationReport,
} from "@/fetchers/hatchery/hatcheryShareQueries";
import { Empty, LoadingState, NotesList, ProblemState, Row, Section, Shell, Tile, fmt, fmtPct } from "./HatcheryShareParts";
import { STAGE_LABEL } from "./HatcherySharedBatchReport";

const LOSS_LABEL: Record<string, string> = {
  INFERTILE: "Infertile (clear eggs)",
  EARLY_DEAD: "Early dead",
  LATE_DEAD: "Late dead",
  UNHATCHED: "Not hatched",
  WEAK_CULL: "Weak / cull",
};
const GRADE_LABEL: Record<string, string> = { A: "Grade A", B: "Grade B", CULL: "Cull" };

export function HatcherySharedIncubationReport({ token, incubationId }: { token: string; incubationId: string }) {
  const { data, isLoading, error } = useHatcheryShareIncubation(token, incubationId);
  const back = (
    <Link
      href={`/share/hatchery-batch/${encodeURIComponent(token)}`}
      className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to batch{data ? ` ${data.batchCode}` : ""}
    </Link>
  );
  if (isLoading) return <LoadingState />;
  if (!data) return <ProblemState status={(error as any)?.response?.status} />;
  return (
    <Shell>
      {back}
      <Report report={data} />
      {back}
    </Shell>
  );
}

function Report({ report }: { report: HatcheryShareIncubationReport }) {
  const { incubation, numbers: n } = report;
  const done = incubation.stage === "COMPLETED";
  const hatched = report.hatchResults.length > 0;

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{incubation.code}</h1>
          {incubation.name && <span className="text-muted-foreground">{incubation.name}</span>}
          <Badge className={done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
            {STAGE_LABEL[incubation.stage]}
          </Badge>
        </div>
        <p className="text-sm">
          From batch {report.batchCode} · Set <DateDisplay date={incubation.setDate} />
          {incubation.currentDay != null && (
            <>
              {" "}
              · Day {incubation.currentDay}
              {incubation.currentDay > incubation.totalDays ? (
                <span className="text-red-600"> · hatch was due on day {incubation.totalDays}</span>
              ) : (
                <> of {incubation.totalDays}</>
              )}
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Eggs set" value={fmt(n.eggsSet)} />
        <Tile label="Fertile" value={fmtPct(n.fertilePercent)} sub={n.fertileEggs != null ? `${fmt(n.fertileEggs)} eggs` : "Not candled yet"} />
        <Tile label="Hatch % of fertile" value={fmtPct(n.hatchOfFertile)} sub={hatched ? `${fmt(n.totalHatched)} chicks` : "Not hatched yet"} />
        <Tile label="Hatch % of all set" value={fmtPct(n.hatchOfSet)} />
      </div>

      <Section icon={Clock} title="Steps">
        <ol className="space-y-2">
          <li className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="flex-1">Eggs set (day 1)</span>
            <DateDisplay date={incubation.setDate} />
          </li>
          {report.timeline.map((step) => (
            <li key={step.label} className="flex items-center gap-2 text-sm">
              {step.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : step.status === "late" ? (
                <Circle className="h-4 w-4 text-red-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1">
                {step.label} (day {step.dueDay})
                {step.status === "late" && <span className="ml-1 text-xs text-red-600">late</span>}
              </span>
              {step.doneDate ? (
                <DateDisplay date={step.doneDate} />
              ) : (
                <span className="text-xs text-muted-foreground">
                  due <DateDisplay date={step.dueDate} />
                </span>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={Egg} title="Eggs">
        {report.eggsByType.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {report.eggsByType.map((t) => (
              <Badge key={t.name} variant="outline">
                {t.name}: {fmt(t.count)}
              </Badge>
            ))}
          </div>
        )}
        <div className="grid gap-x-6 sm:grid-cols-2">
          <div>
            <Row label="Eggs set" value={fmt(n.eggsSet)} />
            <Row label="Infertile (clear)" value={fmt(n.infertile)} />
            <Row label="Early dead" value={fmt(n.earlyDead)} />
          </div>
          <div>
            <Row label="Fertile eggs" value={n.fertileEggs != null ? `${fmt(n.fertileEggs)} (${fmtPct(n.fertilePercent)})` : "—"} />
            <Row label="Late dead" value={hatched ? fmt(n.lateDead) : "—"} />
            <Row label="Not hatched" value={hatched ? fmt(n.unhatched) : "—"} />
          </div>
        </div>
        {report.losses.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Candling</p>
            <div className="divide-y rounded-lg border text-sm">
              {report.losses.map((loss, i) => (
                <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
                  <span>
                    <DateDisplay date={loss.date} /> · {LOSS_LABEL[loss.type] ?? loss.type}
                  </span>
                  <span className="font-medium">{fmt(loss.count)} eggs</span>
                  {loss.note && <p className="w-full text-xs text-muted-foreground">{loss.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section icon={Sun} title="Hatch result">
        {!hatched ? (
          <Empty>Not hatched yet.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Tile label="Grade A" value={fmt(n.hatchedA)} sub={fmtPct(n.gradeAPercent)} />
              <Tile label="Grade B" value={fmt(n.hatchedB)} sub={fmtPct(n.gradeBPercent)} />
              <Tile label="Cull" value={fmt(n.cull)} sub={fmtPct(n.cullPercent)} />
            </div>
            <div className="divide-y rounded-lg border text-sm">
              {report.hatchResults.map((r, i) => (
                <div key={i} className="space-y-0.5 px-3 py-2">
                  <p>
                    <DateDisplay date={r.date} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A {fmt(r.hatchedA)} · B {fmt(r.hatchedB)} · Cull {fmt(r.cull)} · Late dead {fmt(r.lateDead)} · Not hatched{" "}
                    {fmt(r.unhatched)}
                  </p>
                  {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {(report.chicksLeft.length > 0 || report.chicksSentOut.length > 0) && (
        <Section icon={FlaskConical} title="Chicks">
          <div className="grid gap-x-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Still at the hatchery</p>
              {report.chicksLeft.length === 0 ? (
                <Empty>None</Empty>
              ) : (
                report.chicksLeft.map((c) => <Row key={c.grade} label={GRADE_LABEL[c.grade] ?? c.grade} value={fmt(c.count)} />)
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Sent out</p>
              {report.chicksSentOut.length === 0 ? (
                <Empty>None</Empty>
              ) : (
                report.chicksSentOut.map((c) => <Row key={c.grade} label={GRADE_LABEL[c.grade] ?? c.grade} value={fmt(c.count)} />)
              )}
            </div>
          </div>
        </Section>
      )}

      {report.notes && (
        <Section icon={NotebookPen} title="Notes">
          <NotesList notes={report.notes} />
        </Section>
      )}

      <p className="text-center text-xs text-muted-foreground">This report does not show any money.</p>
    </>
  );
}
