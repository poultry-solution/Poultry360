"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BillSettingsInputSchema } from "@myapp/shared-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { useAuth } from "@/common/store/store";
import { useI18n } from "@/i18n/useI18n";
import { BillBusinessHeader } from "@/components/bills/BillDocument";
import { useGetBillSettings, useUpdateBillSettings } from "@/fetchers/billSettings/billSettingsQueries";

type FieldKey = "businessName" | "address" | "panNumber" | "phone" | "footerNote";
type FormValues = Record<FieldKey, string>;

const EMPTY_FORM: FormValues = { businessName: "", address: "", panNumber: "", phone: "", footerNote: "" };

/**
 * Settings → Bill details. Owner only: business name, address, PAN, phone and a
 * footer note printed on sale bills. Empty fields use the business record.
 */
export function BillSettingsCard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isStaff = Boolean(user?.isStaff);
  const { data, isLoading } = useGetBillSettings({ enabled: !isStaff });
  const updateBillSettings = useUpdateBillSettings();
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const savedForm = useMemo<FormValues>(
    () => ({
      businessName: data?.saved.businessName ?? "",
      address: data?.saved.address ?? "",
      panNumber: data?.saved.panNumber ?? "",
      phone: data?.saved.phone ?? "",
      footerNote: data?.saved.footerNote ?? "",
    }),
    [data]
  );

  useEffect(() => {
    setForm(savedForm);
  }, [savedForm]);

  if (isStaff) return null;

  const defaults = data?.defaults;
  const changed = (Object.keys(form) as FieldKey[]).some((key) => form[key].trim() !== savedForm[key].trim());

  const setField = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const preview = {
    name: form.businessName.trim() || defaults?.businessName || "—",
    address: form.address.trim() || defaults?.address,
    phone: form.phone.trim() || defaults?.phone,
    panNumber: form.panNumber.trim() || null,
  };

  const handleSave = async () => {
    const parsed = BillSettingsInputSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<FieldKey, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FieldKey;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    try {
      await updateBillSettings.mutateAsync(parsed.data);
      setErrors({});
      toast.success(t("settings.bill.saved"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("settings.bill.saveFailed"));
    }
  };

  const fields: { key: FieldKey; label: string; placeholder?: string | null; multiline?: boolean; inputMode?: "numeric" | "tel" }[] = [
    { key: "businessName", label: t("settings.bill.businessName"), placeholder: defaults?.businessName },
    { key: "address", label: t("settings.bill.address"), placeholder: defaults?.address, multiline: true },
    { key: "panNumber", label: t("settings.bill.panNumber"), placeholder: "123456789", inputMode: "numeric" },
    { key: "phone", label: t("settings.bill.phone"), placeholder: defaults?.phone, inputMode: "tel" },
    { key: "footerNote", label: t("settings.bill.footerNote"), placeholder: t("settings.bill.footerNotePlaceholder") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.bill.title")}</CardTitle>
        <CardDescription>{t("settings.bill.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key} className={field.multiline || field.key === "footerNote" ? "md:col-span-2" : ""}>
                  <Label htmlFor={`bill-${field.key}`}>{field.label}</Label>
                  {field.multiline ? (
                    <Textarea
                      id={`bill-${field.key}`}
                      value={form[field.key]}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={field.placeholder || ""}
                      rows={2}
                      className="mt-1"
                    />
                  ) : (
                    <Input
                      id={`bill-${field.key}`}
                      value={form[field.key]}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={field.placeholder || ""}
                      inputMode={field.inputMode}
                      className="mt-1"
                    />
                  )}
                  {errors[field.key] && <p className="mt-1 text-xs text-red-600">{errors[field.key]}</p>}
                </div>
              ))}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("settings.bill.preview")}
              </p>
              <div className="rounded-md border border-dashed border-gray-300 bg-white p-4 text-slate-900">
                <BillBusinessHeader business={preview} compact />
                {form.footerNote.trim() && (
                  <p className="mt-2 border-t pt-2 text-center text-xs text-slate-600">{form.footerNote.trim()}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleSave} disabled={!changed || updateBillSettings.isPending}>
                {updateBillSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("settings.bill.save")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
