"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BillSettingsInputSchema, type BillDetails } from "@myapp/shared-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { useAuth } from "@/common/store/store";
import { formatNepalPhone, nepalPhoneDigits } from "@/common/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { BillBusinessHeader } from "@/components/bills/BillDocument";
import { useGetBillSettings, useUpdateBillSettings } from "@/fetchers/billSettings/billSettingsQueries";

type FieldKey = "businessName" | "address" | "panNumber" | "phone" | "footerNote";
/** Form values; `phone` holds only the 10 digits after +977. */
type FormValues = Record<FieldKey, string>;

const KEYS: FieldKey[] = ["businessName", "address", "panNumber", "phone", "footerNote"];
const MAX: Record<FieldKey, number> = { businessName: 120, address: 200, panNumber: 9, phone: 10, footerNote: 200 };

/** What goes in a box: the saved value, else the business detail (no placeholders). */
function startValues(saved?: BillDetails, defaults?: BillDetails): FormValues {
  const pick = (key: FieldKey) => saved?.[key] ?? defaults?.[key] ?? "";
  return {
    businessName: pick("businessName"),
    address: pick("address"),
    panNumber: pick("panNumber").replace(/\D/g, "").slice(0, 9),
    phone: nepalPhoneDigits(pick("phone")),
    footerNote: pick("footerNote"),
  };
}

/**
 * Settings → Bill details (owner only). Shown read-only with an Edit button.
 * Edit opens boxes filled with what prints; an empty box uses the business details.
 */
export function BillSettingsCard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isStaff = Boolean(user?.isStaff);
  const { data, isLoading } = useGetBillSettings({ enabled: !isStaff });
  const updateBillSettings = useUpdateBillSettings();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormValues>(startValues());

  const initial = useMemo(() => startValues(data?.saved, data?.defaults), [data]);
  useEffect(() => {
    if (!editing) setForm(initial);
  }, [initial, editing]);

  if (isStaff) return null;

  const saved = data?.saved;
  const defaults = data?.defaults;

  // Live checks while typing, only on boxes the user changed (an old business phone
  // that is not 10 digits must not block saving other fields).
  const errors: Partial<Record<FieldKey, string>> = {};
  if (form.panNumber !== initial.panNumber && form.panNumber && form.panNumber.length !== 9) {
    errors.panNumber = t("settings.bill.panInvalid");
  }
  if (form.phone !== initial.phone && form.phone && form.phone.length !== 10) {
    errors.phone = t("settings.bill.phoneInvalid");
  }
  const hasErrors = Object.keys(errors).length > 0;
  const changed = KEYS.some((key) => form[key].trim() !== initial[key].trim());

  const setField = (key: FieldKey, raw: string) => {
    const value = key === "panNumber" || key === "phone" ? raw.replace(/\D/g, "").slice(0, MAX[key]) : raw;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /** Value to save: null when empty, or when it is just the unchanged business detail. */
  const toSave = (key: FieldKey): string | null => {
    const value = key === "phone" ? (form.phone ? `+977${form.phone}` : "") : form[key].trim();
    if (!value) return null;
    const fromBusiness = saved?.[key] == null && defaults?.[key] != null;
    // Unchanged box: keep what is stored now. An older saved phone ("98…") is saved in the
    // new "+977…" form so it passes the rule.
    if (form[key] === initial[key]) {
      if (fromBusiness) return null;
      if (key === "phone" && saved?.phone && form.phone.length === 10) return `+977${form.phone}`;
      return saved?.[key] ?? null;
    }
    const sameAsBusiness =
      key === "phone" ? nepalPhoneDigits(defaults?.phone) === form.phone : (defaults?.[key] ?? "").trim() === value;
    return fromBusiness && sameAsBusiness ? null : value;
  };

  const handleSave = async () => {
    if (hasErrors || !changed || updateBillSettings.isPending) return;
    const input = Object.fromEntries(KEYS.map((key) => [key, toSave(key)]));
    const parsed = BillSettingsInputSchema.safeParse(input);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || t("settings.bill.saveFailed"));
      return;
    }
    try {
      await updateBillSettings.mutateAsync(parsed.data);
      toast.success(t("settings.bill.saved"));
      setEditing(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("settings.bill.saveFailed"));
    }
  };

  const cancel = () => {
    setForm(initial);
    setEditing(false);
  };

  const labels: Record<FieldKey, string> = {
    businessName: t("settings.bill.businessName"),
    address: t("settings.bill.address"),
    panNumber: t("settings.bill.panNumber"),
    phone: t("settings.bill.phone"),
    footerNote: t("settings.bill.footerNote"),
  };

  // What prints: saved value, else the business detail.
  const printed = (key: FieldKey) => saved?.[key] ?? defaults?.[key] ?? null;
  const preview = editing
    ? {
        name: form.businessName.trim() || defaults?.businessName || "—",
        address: form.address.trim() || defaults?.address,
        phone: form.phone ? formatNepalPhone(`+977${form.phone}`) : formatNepalPhone(defaults?.phone),
        panNumber: form.panNumber || defaults?.panNumber || null,
      }
    : {
        name: printed("businessName") || "—",
        address: printed("address"),
        phone: printed("phone") ? formatNepalPhone(printed("phone")) : null,
        panNumber: printed("panNumber"),
      };
  const footer = editing ? form.footerNote.trim() || defaults?.footerNote : printed("footerNote");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>{t("settings.bill.title")}</CardTitle>
          <CardDescription>{t("settings.bill.description")}</CardDescription>
        </div>
        {!editing && !isLoading && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            {t("settings.bill.edit")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : !editing ? (
          <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
            {KEYS.map((key) => {
              const value = printed(key);
              const fromBusiness = saved?.[key] == null && value != null;
              return (
                <div key={key} className={key === "address" || key === "footerNote" ? "md:col-span-2" : ""}>
                  <dt className="text-xs text-muted-foreground">{labels[key]}</dt>
                  <dd className={`mt-0.5 break-words ${fromBusiness ? "text-muted-foreground" : "font-medium"}`}>
                    {value ? (key === "phone" ? formatNepalPhone(value) : value) : "—"}
                    {fromBusiness && (
                      <span className="ml-1.5 text-xs">({t("settings.bill.fromBusiness")})</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="bill-businessName">{labels.businessName}</Label>
                <Input
                  id="bill-businessName"
                  className="mt-1"
                  maxLength={MAX.businessName}
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bill-address">{labels.address}</Label>
                <Textarea
                  id="bill-address"
                  className="mt-1"
                  rows={2}
                  maxLength={MAX.address}
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bill-panNumber">{labels.panNumber}</Label>
                <Input
                  id="bill-panNumber"
                  className="mt-1"
                  inputMode="numeric"
                  maxLength={MAX.panNumber}
                  value={form.panNumber}
                  onChange={(e) => setField("panNumber", e.target.value)}
                  aria-invalid={!!errors.panNumber}
                />
                {errors.panNumber && <p className="mt-1 text-xs text-red-600">{errors.panNumber}</p>}
              </div>
              <div>
                <Label htmlFor="bill-phone">{labels.phone}</Label>
                <div className="mt-1 flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                    +977
                  </span>
                  <Input
                    id="bill-phone"
                    className="rounded-l-none"
                    inputMode="tel"
                    maxLength={MAX.phone}
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    aria-invalid={!!errors.phone}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bill-footerNote">{labels.footerNote}</Label>
                <Input
                  id="bill-footerNote"
                  className="mt-1"
                  maxLength={MAX.footerNote}
                  value={form.footerNote}
                  onChange={(e) => setField("footerNote", e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.bill.emptyHint")}</p>
          </>
        )}

        {!isLoading && (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("settings.bill.preview")}
            </p>
            <div className="rounded-md border border-dashed border-gray-300 bg-white p-4 text-slate-900">
              <BillBusinessHeader business={preview} compact />
              {footer && <p className="mt-2 border-t pt-2 text-center text-xs text-slate-600">{footer}</p>}
            </div>
          </div>
        )}

        {editing && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancel} disabled={updateBillSettings.isPending}>
              {t("settings.bill.cancel")}
            </Button>
            <Button type="button" onClick={handleSave} disabled={hasErrors || !changed || updateBillSettings.isPending}>
              {updateBillSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("settings.bill.save")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
