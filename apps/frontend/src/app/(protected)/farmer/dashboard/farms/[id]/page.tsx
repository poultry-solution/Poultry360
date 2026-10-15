"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
  Wheat,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { DateDisplay } from "@/common/components/ui/date-display";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { StatTile, rupees } from "@/components/dashboard/StatsCards";
import {
  FcrText,
  count,
  moneyClass,
  percent,
  signedRupees,
} from "@/components/analytics/farmer/shared";
import { FarmFormModal } from "@/components/farms/FarmFormModal";
import {
  useDeleteFarm,
  useGetFarmSummary,
  type FarmSummary,
} from "@/fetchers/farms/farmQueries";
import { useI18n } from "@/i18n/useI18n";

type Filter = "all" | "running" | "closed";
const DESKTOP_COLS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
};
type BatchRow = FarmSummary["batches"][number];

export default function FarmDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const farmId = String(params?.id ?? "");
  const { data, isLoading, isError } = useGetFarmSummary(farmId);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.batches ?? []).filter(
      (row) =>
        (filter === "all" ||
          (filter === "running"
            ? row.status === "ACTIVE"
            : row.status === "COMPLETED")) &&
        (!query || row.batchNumber.toLowerCase().includes(query)),
    );
  }, [data, filter, search]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-64 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[74px] animate-pulse rounded-lg border bg-gray-50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <CardContent className="space-y-3 py-10 text-center">
          <p className="font-medium">{t("farmer.farms.detail.notFound")}</p>
          <Button
            variant="outline"
            onClick={() => router.push("/farmer/dashboard/farms")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("farmer.farms.detail.backToFarms")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { farm, tiles } = data;
  const running = data.batches.filter((row) => row.status === "ACTIVE").length;
  const closed = data.batches.length - running;
  // FCR only matters on farms with broilers; an odd tile count puts Batches full width on phones.
  const hasBroilers = data.batches.some((row) => row.batchType === "BROILER");
  const tileCount = 1 + (hasBroilers ? 1 : 0) + (data.showMoney ? 3 : 0);
  const addBatch = () =>
    router.push(`/farmer/dashboard/batches?new=1&farmId=${farm.id}`);

  const ageText = (row: BatchRow) =>
    row.status === "COMPLETED"
      ? t("farmer.farms.detail.closedAfter", { n: row.day })
      : t("farmer.farms.detail.dayN", { n: row.day });
  const birdsText = (row: BatchRow) =>
    row.status === "ACTIVE"
      ? t("farmer.farms.detail.aliveOf", {
          alive: count(row.alive),
          started: count(row.started),
        })
      : t("farmer.farms.detail.soldOf", {
          sold: count(row.sold),
          started: count(row.started),
        });
  const typeLabel = (row: BatchRow) =>
    row.batchType === "LAYERS"
      ? t("farmer.farms.detail.layers")
      : t("farmer.farms.detail.broiler");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            asChild
          >
            <Link
              href="/farmer/dashboard/farms"
              aria-label={t("farmer.farms.detail.backToFarms")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{farm.name}</h1>
            <p className="text-sm text-muted-foreground">
              {t("farmer.farms.detail.capacityLine", {
                n: count(farm.capacity),
              })}
              {farm.description && ` · ${farm.description}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            {t("farmer.farms.detail.edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t("farmer.farms.detail.delete")}
          </Button>
        </div>
      </div>

      {/* Tiles */}
      <div className={`grid grid-cols-2 gap-3 ${DESKTOP_COLS[tileCount]}`}>
        <div className={tileCount % 2 === 1 ? "col-span-2 md:col-span-1" : ""}>
          <StatTile
            tile={{
              label: t("farmer.farms.detail.batches"),
              icon: Layers,
              value: t("farmer.farms.detail.runningN", {
                n: tiles.runningBatches,
              }),
              sub: t("farmer.farms.detail.batchesSub", {
                alive: count(tiles.birdsAlive),
                total: tiles.totalBatches,
              }),
            }}
          />
        </div>
        {hasBroilers && (
          <StatTile
            tile={{
              label: "FCR",
              icon: Wheat,
              value: tiles.fcr != null ? tiles.fcr.toFixed(2) : "—",
              valueClass: tiles.fcrIsOld ? "text-amber-600" : "",
              sub:
                tiles.fcr == null
                  ? t("farmer.farms.detail.fcrNone")
                  : tiles.fcrIsOld
                    ? t("farmer.farms.detail.fcrOld")
                    : t("farmer.farms.detail.fcrNow"),
            }}
          />
        )}
        {data.showMoney && (
          <>
            <StatTile
              tile={{
                label: t("farmer.farms.detail.sales"),
                icon: TrendingUp,
                value: rupees(tiles.sales ?? 0),
                sub: t("farmer.farms.detail.allTime"),
              }}
            />
            <StatTile
              tile={{
                label: t("farmer.farms.detail.costs"),
                icon: Receipt,
                value: rupees(tiles.costs ?? 0),
                sub: t("farmer.farms.detail.allTime"),
              }}
            />
            <StatTile
              tile={{
                label:
                  (tiles.profit ?? 0) < 0
                    ? t("farmer.farms.detail.loss")
                    : t("farmer.farms.detail.profit"),
                icon: Wallet,
                value: signedRupees(tiles.profit ?? 0),
                valueClass: moneyClass(tiles.profit ?? 0),
                sub: t("farmer.farms.detail.allTime"),
              }}
            />
          </>
        )}
      </div>

      {/* Batches */}
      <Card className="gap-3 py-0">
        <div className="space-y-3 px-3 pt-3 md:px-5 md:pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              {t("farmer.farms.detail.batchesTitle")}
            </h2>
            <Button size="sm" onClick={addBatch}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("farmer.farms.detail.addBatch")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                [
                  "all",
                  t("farmer.farms.detail.filterAll", {
                    n: data.batches.length,
                  }),
                ],
                [
                  "running",
                  t("farmer.farms.detail.filterRunning", { n: running }),
                ],
                [
                  "closed",
                  t("farmer.farms.detail.filterClosed", { n: closed }),
                ],
              ] as Array<[Filter, string]>
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                className="h-8"
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
            <div className="relative w-full sm:ml-auto sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("farmer.farms.detail.searchBatches")}
                className="h-9 pl-8"
              />
            </div>
          </div>
        </div>

        <CardContent className="px-0 pb-2">
          {data.batches.length === 0 ? (
            <div className="space-y-3 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {t("farmer.farms.detail.noBatches")}
              </p>
              <Button size="sm" onClick={addBatch}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t("farmer.farms.detail.addBatch")}
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("farmer.farms.detail.noMatch")}
            </p>
          ) : (
            <>
              {/* Desktop */}
              <table className="hidden w-full text-sm md:table">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-5 py-2 text-left font-normal">
                      {t("farmer.farms.detail.batch")}
                    </th>
                    <th className="px-3 py-2 text-left font-normal">
                      {t("farmer.farms.detail.started")}
                    </th>
                    <th className="px-3 py-2 text-right font-normal">
                      {t("farmer.farms.detail.age")}
                    </th>
                    <th className="px-3 py-2 text-right font-normal">
                      {t("farmer.farms.detail.birds")}
                    </th>
                    <th className="px-3 py-2 text-right font-normal">
                      {t("farmer.farms.detail.deaths")}
                    </th>
                    {hasBroilers && (
                      <th className="px-3 py-2 text-right font-normal">FCR</th>
                    )}
                    {data.showMoney && (
                      <th className="px-3 py-2 text-right font-normal">
                        {t("farmer.farms.detail.profit")}
                      </th>
                    )}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() =>
                        router.push(`/farmer/dashboard/batches/${row.id}`)
                      }
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-5 py-2.5">
                        <p className="font-medium">{row.batchNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabel(row)}
                          {row.status === "ACTIVE" && (
                            <Badge
                              variant="outline"
                              className="ml-1.5 border-green-600/30 px-1.5 py-0 text-[10px] text-green-700"
                            >
                              {t("farmer.farms.detail.running")}
                            </Badge>
                          )}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <DateDisplay date={row.startDate} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        {ageText(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        {birdsText(row)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2.5 text-right ${row.deathPercent >= 5 ? "text-red-600" : ""}`}
                      >
                        {percent(row.deathPercent, 2)}
                      </td>
                      {hasBroilers && (
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">
                          {row.batchType === "BROILER" ? (
                            <FcrText
                              value={row.fcr}
                              status={row.fcrStatus}
                              t={t}
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                      {data.showMoney && (
                        <td
                          className={`whitespace-nowrap px-3 py-2.5 text-right font-medium ${moneyClass(row.profit ?? 0)}`}
                        >
                          {signedRupees(row.profit ?? 0)}
                          {row.status === "ACTIVE" && (
                            <span className="block text-[11px] font-normal text-muted-foreground">
                              {t("farmer.farms.detail.soFar")}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="pr-3 text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Phone */}
              <ul className="divide-y md:hidden">
                {rows.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/farmer/dashboard/batches/${row.id}`}
                      className="flex items-center gap-3 px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium">
                            {row.batchNumber}
                          </p>
                          {data.showMoney && (
                            <p
                              className={`shrink-0 whitespace-nowrap text-sm font-semibold ${moneyClass(row.profit ?? 0)}`}
                            >
                              {signedRupees(row.profit ?? 0)}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {typeLabel(row)} · {ageText(row)} ·{" "}
                          <DateDisplay date={row.startDate} />
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {birdsText(row)} · {t("farmer.farms.detail.deaths")}{" "}
                          {percent(row.deathPercent, 2)}
                          {row.batchType === "BROILER" && row.fcr != null && (
                            <> · FCR {row.fcr.toFixed(2)}</>
                          )}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <FarmFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        farm={farm}
      />
      <DeleteFarmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        farmId={farm.id}
        farmName={farm.name}
        canDelete={data.canDelete}
        onDeleted={() => router.push("/farmer/dashboard/farms")}
      />
    </div>
  );
}

function DeleteFarmModal({
  isOpen,
  onClose,
  farmId,
  farmName,
  canDelete,
  onDeleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  farmId: string;
  farmName: string;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const { t } = useI18n();
  const deleteFarm = useDeleteFarm();
  const [password, setPassword] = useState("");

  const close = () => {
    setPassword("");
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || deleteFarm.isPending) return;
    try {
      await deleteFarm.mutateAsync({ id: farmId, password });
      toast.success(t("farmer.farms.delete.deleted"));
      close();
      onDeleted();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || t("farmer.farms.delete.failed"),
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={t("farmer.farms.delete.title", { name: farmName })}
    >
      {canDelete ? (
        <form onSubmit={submit}>
          <ModalContent>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {t("farmer.farms.delete.body")}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="delete-farm-password">
                  {t("farmer.farms.delete.password")}
                </Label>
                <Input
                  id="delete-farm-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t("farmer.farms.delete.cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!password || deleteFarm.isPending}
            >
              {deleteFarm.isPending && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {t("farmer.farms.delete.confirm")}
            </Button>
          </ModalFooter>
        </form>
      ) : (
        <>
          <ModalContent>
            <p className="text-sm text-muted-foreground">
              {t("farmer.farms.delete.hasRecords")}
            </p>
          </ModalContent>
          <ModalFooter>
            <Button variant="outline" onClick={close}>
              {t("farmer.farms.delete.ok")}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
