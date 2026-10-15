"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Layers } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { rupees } from "@/components/dashboard/StatsCards";
import type { BatchStatRow, FarmerBatchesAnalytics } from "@/fetchers/analytics/farmerAnalyticsQueries";
import { useI18n } from "@/i18n/useI18n";
import { EmptyLine, FcrText, Section, TabLoading, count, kg, moneyClass, percent, signedRupees } from "./shared";

type SortKey = "batchNumber" | "day" | "started" | "deathPercent" | "feedKg" | "fcr" | "costPerBird" | "profit";

export function BatchesTab({ data, loading }: { data?: FarmerBatchesAnalytics; loading: boolean }) {
  const { t } = useI18n();
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "profit", desc: true });

  const rows = useMemo(() => {
    const list = [...(data?.batches ?? [])];
    list.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(String(bv)) : Number(av) - Number(bv);
      return sort.desc ? -cmp : cmp;
    });
    return list;
  }, [data, sort]);

  if (!data) return loading ? <TabLoading /> : null;

  const withBirds = data.batches.filter((row) => row.profitPerBird != null && row.status === "COMPLETED");
  const best = withBirds.length ? withBirds.reduce((a, b) => (b.profitPerBird! > a.profitPerBird! ? b : a)) : null;
  const worst = withBirds.length > 1 ? withBirds.reduce((a, b) => (b.profitPerBird! < a.profitPerBird! ? b : a)) : null;

  const header = (key: SortKey, label: string, align: "left" | "right" = "right") => (
    <th className={`py-2 pr-3 font-normal ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
      >
        {label}
        {sort.key === key && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </th>
  );

  const dayText = (row: BatchStatRow) =>
    row.status === "COMPLETED"
      ? t("farmer.analytics.batches.closedAfter", { n: row.day })
      : t("farmer.analytics.dayN", { n: row.day });

  return (
    <div className="space-y-4">
      {best && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border bg-white px-3 py-2 text-sm">
          <span>
            {t("farmer.analytics.batches.best")}: <strong>{best.batchNumber}</strong>{" "}
            <span className={moneyClass(best.profitPerBird!)}>{signedRupees(best.profitPerBird!)}</span>{" "}
            <span className="text-xs text-muted-foreground">{t("farmer.analytics.batches.perBird")}</span>
          </span>
          {worst && worst.id !== best.id && (
            <span>
              {t("farmer.analytics.batches.worst")}: <strong>{worst.batchNumber}</strong>{" "}
              <span className={moneyClass(worst.profitPerBird!)}>{signedRupees(worst.profitPerBird!)}</span>{" "}
              <span className="text-xs text-muted-foreground">{t("farmer.analytics.batches.perBird")}</span>
            </span>
          )}
        </div>
      )}

      <Section
        title={t("farmer.analytics.batches.title")}
        icon={Layers}
        right={<span className="text-xs text-muted-foreground">{t("farmer.analytics.batches.wholeLife")}</span>}
      >
        {rows.length === 0 ? (
          <EmptyLine text={t("farmer.analytics.batches.none")} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    {header("batchNumber", t("farmer.analytics.batch"), "left")}
                    {header("day", t("farmer.analytics.batches.age"))}
                    {header("started", t("farmer.analytics.batches.birds"))}
                    {header("deathPercent", t("farmer.analytics.deaths"))}
                    {header("feedKg", t("farmer.analytics.feed"))}
                    {header("fcr", "FCR")}
                    {header("costPerBird", t("farmer.analytics.batches.costPerBird"))}
                    {header("profit", t("farmer.analytics.profit"))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-3">
                        <Link href={`/farmer/dashboard/batches/${row.id}`} className="font-medium hover:underline">
                          {row.batchNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {row.farmName} · {row.batchType === "LAYERS" ? t("farmer.analytics.layers") : t("farmer.analytics.broiler")}
                        </p>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">{dayText(row)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">
                        {count(row.started)}
                        <p className="text-xs text-muted-foreground">
                          {row.status === "ACTIVE"
                            ? t("farmer.analytics.batches.aliveN", { n: count(row.alive) })
                            : t("farmer.analytics.batches.soldN", { n: count(row.sold) })}
                        </p>
                      </td>
                      <td className={`whitespace-nowrap py-2 pr-3 text-right ${row.deathPercent >= 5 ? "text-red-600" : ""}`}>
                        {percent(row.deathPercent, 2)}
                        <p className="text-xs text-muted-foreground">{count(row.died)}</p>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">{kg(row.feedKg, 0)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">
                        {row.batchType === "BROILER" ? <FcrText value={row.fcr} status={row.fcrStatus} t={t} /> : "—"}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">
                        {row.costPerBird != null ? rupees(row.costPerBird) : "—"}
                      </td>
                      <td className={`whitespace-nowrap py-2 text-right font-medium ${moneyClass(row.profit)}`}>
                        {signedRupees(row.profit)}
                        {row.status === "ACTIVE" && (
                          <p className="text-xs font-normal text-muted-foreground">{t("farmer.analytics.batches.soFar")}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phone cards */}
            <ul className="space-y-2 md:hidden">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link href={`/farmer/dashboard/batches/${row.id}`} className="block rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{row.batchNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.farmName} · {dayText(row)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`whitespace-nowrap font-semibold ${moneyClass(row.profit)}`}>{signedRupees(row.profit)}</p>
                        {row.status === "ACTIVE" ? (
                          <Badge variant="outline" className="border-green-600/30 text-[10px] text-green-700">
                            {t("farmer.analytics.batches.soFar")}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <Mini label={t("farmer.analytics.batches.birds")} value={count(row.started)} />
                      <Mini label={t("farmer.analytics.deaths")} value={percent(row.deathPercent, 2)} danger={row.deathPercent >= 5} />
                      <Mini label={t("farmer.analytics.feed")} value={kg(row.feedKg, 0)} />
                      <Mini
                        label="FCR"
                        value={row.batchType === "BROILER" && row.fcr != null ? row.fcr.toFixed(2) : "—"}
                      />
                      <Mini
                        label={t("farmer.analytics.batches.costPerBird")}
                        value={row.costPerBird != null ? rupees(row.costPerBird) : "—"}
                      />
                      <Mini
                        label={t("farmer.analytics.batches.profitPerBird")}
                        value={row.profitPerBird != null ? signedRupees(row.profitPerBird) : "—"}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </div>
  );
}

function Mini({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`font-medium ${danger ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}
