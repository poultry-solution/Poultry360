"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Tag, Plus, Pencil, Trash2, Archive, ArchiveRestore, Loader2, MapPin, LocateFixed, X } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalFooter,
} from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DateInput } from "@/common/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { useAuth } from "@/common/store/store";
import { useI18n } from "@/i18n/useI18n";
import {
  useFarmerListForSale,
  useCreateListForSale,
  useUpdateListForSale,
  useDeleteListForSale,
  useArchiveListForSale,
  useUnarchiveListForSale,
  type ListForSaleItem,
  type ListForSaleCategory,
  type CreateListForSaleBody,
  type EggVariant,
  type TypeVariant,
} from "@/fetchers/listForSale/listForSaleQueries";
import { DateDisplay } from "@/common/components/ui/date-display";
import { usePublicLocationSearch, reversePublicLocation } from "@/fetchers/public/locationQueries";

const CATEGORIES: ListForSaleCategory[] = ["CHICKEN", "EGGS", "LAYERS", "FISH"];

const defaultForm = (): CreateListForSaleBody => ({
  category: "CHICKEN",
  phone: "",
  rate: null,
  quantity: 0,
  unit: "kg",
  availabilityFrom: new Date().toISOString().split("T")[0] + "T00:00:00.000Z",
  availabilityTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T23:59:59.999Z",
  address: "",
  province: null,
  latitude: null,
  longitude: null,
  avgWeightKg: undefined,
  eggVariants: null,
  typeVariants: null,
});

function categoryLabelKey(cat: ListForSaleCategory): string {
  const keyMap: Record<ListForSaleCategory, string> = {
    CHICKEN: "farmerListForSale.categories.chicken",
    EGGS: "farmerListForSale.categories.eggs",
    LAYERS: "farmerListForSale.categories.layers",
    FISH: "farmerListForSale.categories.fish",
    OTHER: "farmerListForSale.categories.other",
  };
  return keyMap[cat] ?? cat;
}

export default function ListForSalePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const companyName = user?.companyName ?? "";

  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ACTIVE");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading } = useFarmerListForSale(
    filterStatus === "ALL" ? undefined : { status: filterStatus as "ACTIVE" | "ARCHIVED" }
  );
  const createMutation = useCreateListForSale();
  const updateMutation = useUpdateListForSale();
  const deleteMutation = useDeleteListForSale();
  const archiveMutation = useArchiveListForSale();
  const unarchiveMutation = useUnarchiveListForSale();

  const listings: ListForSaleItem[] = data?.data ?? [];

  const [form, setForm] = useState<CreateListForSaleBody>(() => defaultForm());
  const [eggRows, setEggRows] = useState<EggVariant[]>([{ size: "", quantity: 0, rate: 0 }]);
  const [typeRows, setTypeRows] = useState<TypeVariant[]>([{ type: "", quantity: 0, rate: 0 }]);
  const [locationSearch, setLocationSearch] = useState("");
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState("");
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const locationQuery = usePublicLocationSearch(debouncedLocationSearch);

  const locationSuggestions = locationQuery.data ?? [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedLocationSearch(locationSearch.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [locationSearch]);

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm());
    setEggRows([{ size: "", quantity: 0, rate: 0 }]);
    setTypeRows([{ type: "", quantity: 0, rate: 0 }]);
    setLocationSearch("");
    setLocationNotice(null);
    setModalOpen(true);
  };

  const openEdit = (item: ListForSaleItem) => {
    setEditingId(item.id);
    setForm({
      category: item.category,
      phone: item.phone,
      rate: item.rate,
      quantity: Number(item.quantity),
      unit: item.unit,
      availabilityFrom: item.availabilityFrom,
      availabilityTo: item.availabilityTo,
      province: item.province ?? null,
      address: item.address ?? null,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      avgWeightKg: item.avgWeightKg != null ? Number(item.avgWeightKg) : undefined,
      eggVariants: item.eggVariants,
      typeVariants: item.typeVariants,
    });
    setEggRows(
      item.eggVariants?.length
        ? item.eggVariants.map((e) => ({ size: e.size, quantity: e.quantity, rate: e.rate }))
        : [{ size: "", quantity: 0, rate: 0 }]
    );
    setTypeRows(
      item.typeVariants?.length
        ? item.typeVariants.map((e) => ({ type: e.type, quantity: e.quantity, rate: e.rate }))
        : [{ type: "", quantity: 0, rate: 0 }]
    );
    setLocationSearch(
      item.address ?? (item.latitude != null && item.longitude != null ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` : "")
    );
    setLocationNotice(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setLocationNotice(null);
  };

  const applyLocationSuggestion = (location: {
    label: string;
    address: string | null;
    province: string | null;
    latitude: number;
    longitude: number;
  }) => {
    setForm((current) => ({
      ...current,
      address: location.address ?? location.label,
      province: location.province,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
    setLocationSearch(location.address ?? location.label);
    setLocationNotice("Location selected");
  };

  const clearLocation = () => {
    setForm((current) => ({
      ...current,
      address: "",
      province: null,
      latitude: null,
      longitude: null,
    }));
    setLocationSearch("");
    setLocationNotice("Location cleared");
  };

  const useCurrentLocation = () => {
    setLocationNotice(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationNotice("Location permission is not available in this browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        try {
          const resolved = await reversePublicLocation(latitude, longitude);
          setForm((current) => ({
            ...current,
            address: resolved.address ?? resolved.label,
            province: resolved.province,
            latitude,
            longitude,
          }));
          setLocationSearch(resolved.address ?? resolved.label);
          setLocationNotice("Current location captured");
        } catch {
          setForm((current) => ({
            ...current,
            latitude,
            longitude,
            province: null,
          }));
          setLocationSearch(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setLocationNotice("Current location captured");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setLocationNotice("Location permission was denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
    );
  };

  const handleSubmit = async () => {
    const category = form.category;
    let payload: CreateListForSaleBody = {
      ...form,
      availabilityFrom: form.availabilityFrom,
      availabilityTo: form.availabilityTo,
    };
    if (category === "CHICKEN" || category === "LAYERS") {
      payload.quantity = Number(form.quantity) || 0;
      payload.rate = form.rate ?? null;
      payload.avgWeightKg = form.avgWeightKg ?? undefined;
      payload.eggVariants = null;
      payload.typeVariants = null;
    } else if (category === "EGGS") {
      const variants = eggRows.filter((r) => r.size.trim() && r.quantity >= 0 && r.rate >= 0);
      if (variants.length === 0) {
        return;
      }
      payload.eggVariants = variants;
      payload.typeVariants = null;
      payload.avgWeightKg = undefined;
      payload.quantity = variants.reduce((sum, r) => sum + r.quantity, 0);
      payload.rate = null;
    } else {
      const variants = typeRows.filter((r) => r.type.trim() && r.quantity >= 0 && r.rate >= 0);
      if (variants.length === 0) {
        return;
      }
      payload.typeVariants = variants;
      payload.eggVariants = null;
      payload.avgWeightKg = undefined;
      payload.quantity = variants.reduce((sum, r) => sum + r.quantity, 0);
      payload.rate = null;
    }

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, body: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  const canSubmit = useMemo(() => {
    if (!form.phone?.trim() || !form.unit?.trim()) return false;
    if (form.category === "CHICKEN" || form.category === "LAYERS") {
      if (form.quantity <= 0) return false;
      if (form.category === "CHICKEN" && (form.avgWeightKg == null || form.avgWeightKg <= 0)) return false;
    }
    if (form.category === "EGGS") {
      const ok = eggRows.some((r) => r.size.trim() && r.quantity >= 0 && r.rate >= 0);
      if (!ok) return false;
    }
    if (form.category === "FISH") {
      const ok = typeRows.some((r) => r.type.trim() && r.quantity >= 0 && r.rate >= 0);
      if (!ok) return false;
    }
    return true;
  }, [form, eggRows, typeRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" />
            {t("sidebar.nav.listForSale")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("farmerListForSale.pageSubtitle")}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          {t("farmerListForSale.addListing")}
        </Button>
      </div>

      <div className="flex gap-2">
        {(["ACTIVE", "ARCHIVED", "ALL"] as const).map((s) => (
          <Button
            key={s}
            variant={filterStatus === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(s)}
          >
            {s === "ALL" ? t("farmerListForSale.filterAll") : s === "ACTIVE" ? t("farmerListForSale.filterActive") : t("farmerListForSale.filterArchived")}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("farmerListForSale.yourListings")}</CardTitle>
          <CardDescription>{t("farmerListForSale.yourListingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : listings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("farmerListForSale.emptyList")}</p>
          ) : (
            <div className="space-y-3">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                    <Badge variant="outline">{t(categoryLabelKey(item.category))}</Badge>
                    <span className="font-medium">{item.companyName}</span>
                    {(item.province || item.address) && (
                      <span className="text-muted-foreground text-xs">
                        {" — "}
                        {item.province}
                        {item.province && item.address ? ", " : ""}
                        {item.address}
                      </span>
                    )}
                    <span className="text-muted-foreground text-sm">
                      {item.eggVariants && item.eggVariants.length > 0
                        ? item.eggVariants.map((v) => `${v.size}: ${v.quantity} @ ${v.rate != null && v.rate !== 0 ? v.rate : t("landing.listForSale.contactForRate")}`).join(" · ")
                        : item.typeVariants && item.typeVariants.length > 0
                          ? item.typeVariants.map((v) => `${v.type}: ${v.quantity} @ ${v.rate != null && v.rate !== 0 ? v.rate : t("landing.listForSale.contactForRate")}`).join(" · ")
                          : `${item.quantity} ${item.unit}${item.rate != null && item.rate !== 0 ? ` @ ${item.rate}` : ` @ ${t("landing.listForSale.contactForRate")}`}`}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      <DateDisplay date={item.availabilityFrom} /> – <DateDisplay date={item.availabilityTo} />
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title={t("farmerListForSale.edit")}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {item.status === "ACTIVE" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => archiveMutation.mutate(item.id)}
                        title={t("farmerListForSale.archive")}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => unarchiveMutation.mutate(item.id)}
                        title={t("farmerListForSale.unarchive")}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteConfirmId(item.id)}
                      title={t("farmerListForSale.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? t("farmerListForSale.modalEditTitle") : t("farmerListForSale.modalAddTitle")}
        className="sm:max-w-3xl lg:max-w-5xl"
      >
        <ModalContent>
          <div className="space-y-5 px-1 max-h-[75vh] overflow-y-auto lg:max-h-none lg:overflow-visible">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <Label>{t("farmerListForSale.companyName")}</Label>
                <Input value={companyName || "N/A"} readOnly disabled className="bg-muted" />
              </div>

              <div className="lg:col-span-2">
                <Label>{t("farmerListForSale.category")}</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as ListForSaleCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(categoryLabelKey(c))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-2">
                <Label>{t("farmerListForSale.phone")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder={t("farmerListForSale.phonePlaceholder")}
                />
              </div>

              <div className="lg:col-span-2 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-slate-900">Exact location</Label>
                    <p className="text-xs text-slate-500">
                      Search an address, use your current location, or type the exact business address.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={isLocating}>
                      <LocateFixed className="h-4 w-4" />
                      {isLocating ? "Locating..." : "Use my location"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={clearLocation}>
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    value={locationSearch}
                    onChange={(e) => {
                      const next = e.target.value;
                      setLocationSearch(next);
                      setForm((current) => ({
                        ...current,
                        address: next,
                      }));
                    }}
                    placeholder="Type an address, business name, or landmark"
                  />

                  {locationQuery.isFetching && <p className="text-xs text-slate-500">Searching locations...</p>}

                  {locationNotice && <p className="text-xs text-emerald-700">{locationNotice}</p>}

                  {debouncedLocationSearch.length >= 2 && locationSuggestions.length > 0 && (
                    <div className="max-h-56 overflow-y-auto rounded-xl border bg-white shadow-sm">
                      {locationSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="flex w-full items-start gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                          onClick={() => applyLocationSuggestion(suggestion)}
                        >
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{suggestion.label}</p>
                            <p className="truncate text-xs text-slate-500">{suggestion.subtitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-600">
                    <p className="font-medium text-slate-700">Saved location</p>
                    <p className="mt-1 break-words">{form.address || "No address selected yet"}</p>
                    <p className="mt-1">
                      Province: {form.province ?? "Auto-derived when location is selected"}
                    </p>
                    <p className="mt-1">
                      {form.latitude != null && form.longitude != null
                        ? `Coordinates: ${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
                        : "Coordinates will be saved when you use your current location or choose a suggestion."}
                    </p>
                  </div>

                  {form.latitude != null && form.longitude != null && (
                    <div className="overflow-hidden rounded-xl border bg-white">
                      <iframe
                        title="Location preview"
                        src={`https://www.openstreetmap.org/export/embed.html?marker=${form.latitude},${form.longitude}&layer=mapnik`}
                        className="h-56 w-full border-0"
                        loading="lazy"
                      />
                      <div className="border-t px-3 py-2 text-xs text-slate-500">
                        Free OpenStreetMap preview. Public users will still navigate via Google Maps links.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(form.category === "CHICKEN" || form.category === "LAYERS") && (
                <>
                  <div>
                    <Label>{t("farmerListForSale.rateOptional")}</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.rate ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          rate: e.target.value === "" ? null : parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder={t("farmerListForSale.ratePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("farmerListForSale.quantity")}</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={form.quantity || ""}
                      onChange={(e) => setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </>
              )}

              <div>
                <Label>{t("farmerListForSale.unit")}</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder={t("farmerListForSale.unitPlaceholder")}
                />
              </div>

              <div>
                <Label>{t("farmerListForSale.availabilityFrom")}</Label>
                <DateInput
                  value={form.availabilityFrom}
                  onChange={(v) => setForm((f) => ({ ...f, availabilityFrom: v }))}
                />
              </div>

              <div>
                <Label>{t("farmerListForSale.availabilityTo")}</Label>
                <DateInput
                  value={form.availabilityTo}
                  onChange={(v) => setForm((f) => ({ ...f, availabilityTo: v }))}
                />
              </div>

              {(form.category === "CHICKEN" || form.category === "LAYERS") && (
                <div>
                  <Label>{t("farmerListForSale.avgWeightKg")}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.avgWeightKg ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        avgWeightKg: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder={t("farmerListForSale.avgWeightPlaceholder")}
                  />
                </div>
              )}

              {form.category === "EGGS" && (
                <div className="lg:col-span-2 space-y-2">
                  <Label>{t("farmerListForSale.sizesLabel")}</Label>
                  {eggRows.map((row, i) => (
                    <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        placeholder={t("farmerListForSale.sizePlaceholder")}
                        value={row.size}
                        onChange={(e) =>
                          setEggRows((prev) => {
                            const n = [...prev];
                            n[i] = { ...n[i], size: e.target.value };
                            return n;
                          })
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder={t("farmerListForSale.qtyPlaceholder")}
                        value={row.quantity || ""}
                        onChange={(e) =>
                          setEggRows((prev) => {
                            const n = [...prev];
                            n[i] = { ...n[i], quantity: parseFloat(e.target.value) || 0 };
                            return n;
                          })
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={t("farmerListForSale.rateColumnHeader")}
                        value={row.rate || ""}
                        onChange={(e) =>
                          setEggRows((prev) => {
                            const n = [...prev];
                            n[i] = { ...n[i], rate: parseFloat(e.target.value) || 0 };
                            return n;
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEggRows((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEggRows((prev) => [...prev, { size: "", quantity: 0, rate: 0 }])}
                  >
                    {t("farmerListForSale.addSize")}
                  </Button>
                </div>
              )}

              {form.category === "FISH" && (
                <div className="lg:col-span-2 space-y-2">
                  <Label>{t("farmerListForSale.typesLabel")}</Label>
                  {typeRows.map((row, i) => (
                    <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        placeholder={t("farmerListForSale.typePlaceholder")}
                        value={row.type}
                        onChange={(e) =>
                          setTypeRows((prev) => {
                            const n = [...prev];
                            n[i] = { ...n[i], type: e.target.value };
                            return n;
                          })
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder={t("farmerListForSale.qtyPlaceholder")}
                        value={row.quantity || ""}
                        onChange={(e) =>
                          setTypeRows((prev) => {
                            const n = [...prev];
                            n[i] = { ...n[i], quantity: parseFloat(e.target.value) || 0 };
                            return n;
                          })
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={t("farmerListForSale.rateColumnHeader")}
                        value={row.rate || ""}
                        onChange={(e) =>
                          setTypeRows((prev) => {
                            const n = [...prev];
                            n[i] = { ...n[i], rate: parseFloat(e.target.value) || 0 };
                            return n;
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setTypeRows((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTypeRows((prev) => [...prev, { type: "", quantity: 0, rate: 0 }])}
                  >
                    {t("farmerListForSale.addType")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={closeModal}>
            {t("farmerListForSale.cancel")}
          </Button>
          <Button
            disabled={!canSubmit || createMutation.isPending || updateMutation.isPending}
            onClick={handleSubmit}
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {editingId ? t("farmerListForSale.saveChanges") : t("farmerListForSale.createListing")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t("farmerListForSale.deleteModalTitle")}
      >
        <ModalContent>
          <p className="text-muted-foreground">{t("farmerListForSale.deleteModalMessage")}</p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
            {t("farmerListForSale.cancel")}
          </Button>
          <Button
            variant="destructive"
            className="bg-destructive text-red hover:bg-destructive/90 hover:text-red cursor-pointer"
            disabled={deleteMutation.isPending}
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
          >
            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("farmerListForSale.delete")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
