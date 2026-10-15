"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { FarmFormModal } from "@/components/farms/FarmFormModal";
import { useGetUserFarms, type FarmListRow } from "@/fetchers/farms/farmQueries";
import { useI18n } from "@/i18n/useI18n";

const PAGE_SIZE = 20;
const count = (value: number) => value.toLocaleString("en-IN");

export default function FarmsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const { data, isLoading, isError } = useGetUserFarms("all", { page, limit: PAGE_SIZE });
  const farms = (data?.data ?? []) as FarmListRow[];
  const pagination = data?.pagination;
  const open = (id: string) => router.push(`/farmer/dashboard/farms/${id}`);

  const birdsCell = (farm: FarmListRow) => (
    <>
      <span className="font-medium">{count(farm.birdsAlive)}</span>
    </>
  );
  const batchesCell = (farm: FarmListRow) =>
    t("farmer.farms.list.batchesCount", { running: count(farm.running), total: count(farm.total) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("farmer.farms.list.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("farmer.farms.list.subtitle")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("farmer.farms.list.addFarm")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border bg-gray-50" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("farmer.farms.list.loadFailed")}
          </CardContent>
        </Card>
      ) : farms.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{t("farmer.farms.list.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("farmer.farms.list.emptyBody")}</p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("farmer.farms.list.addFarm")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden py-0 md:block">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-normal">{t("farmer.farms.list.farm")}</th>
                  <th className="px-4 py-3 text-right font-normal">{t("farmer.farms.list.capacity")}</th>
                  <th className="px-4 py-3 text-right font-normal">{t("farmer.farms.list.birdsAlive")}</th>
                  <th className="px-4 py-3 text-right font-normal">{t("farmer.farms.list.batches")}</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr
                    key={farm.id}
                    onClick={() => open(farm.id)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{farm.name}</p>
                      {farm.description && (
                        <p className="max-w-md truncate text-xs text-muted-foreground">{farm.description}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {t("farmer.farms.list.birdsN", { n: count(farm.capacity) })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{birdsCell(farm)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{batchesCell(farm)}</td>
                    <td className="pr-3 text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Phone */}
          <ul className="space-y-2 md:hidden">
            {farms.map((farm) => (
              <li key={farm.id}>
                <button
                  type="button"
                  onClick={() => open(farm.id)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{farm.name}</p>
                    {farm.description && <p className="truncate text-xs text-muted-foreground">{farm.description}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {t("farmer.farms.list.birdsAlive")}: <span className="text-foreground">{birdsCell(farm)}</span>
                      </span>
                      <span>{batchesCell(farm)}</span>
                      <span>{t("farmer.farms.list.capacityN", { n: count(farm.capacity) })}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground">
                {t("farmer.farms.list.pageOf", { page, total: pagination.totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <FarmFormModal isOpen={addOpen} onClose={() => setAddOpen(false)} onSaved={(id) => id && open(id)} />
    </div>
  );
}
