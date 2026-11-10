"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { useAuth } from "@/common/store/store";
import { useI18n } from "@/i18n/useI18n";
import {
  CFCR_CORRECTION_MAX,
  CFCR_DEFAULT_CORRECTION_PER_KG,
  CFCR_DEFAULT_TARGET_KG,
  CFCR_TARGET_MAX_KG,
  CFCR_TARGET_MIN_KG,
  useGetFarmerFcrSettings,
  useUpdateFarmerFcrSettings,
} from "@/fetchers/fcrSettingsQueries";

// Example batch used to explain the numbers: sold at 2.4 kg with FCR 1.80.
const EXAMPLE_WEIGHT_KG = 2.4;
const EXAMPLE_FCR = 1.8;

/** One cFCR standard for the whole account. Every broiler batch uses it. */
export function CfcrStandardCard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const canEdit = !user?.isStaff;
  const settings = useGetFarmerFcrSettings();
  const update = useUpdateFarmerFcrSettings();
  const [target, setTarget] = useState("");
  const [correction, setCorrection] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!settings.data) return;
    setTarget(String(settings.data.targetWeightKg));
    setCorrection(String(settings.data.correctionFactorPerKg));
  }, [settings.data]);

  const targetNumber = Number(target);
  const correctionNumber = Number(correction);
  const valid =
    target.trim() !== "" &&
    correction.trim() !== "" &&
    Number.isFinite(targetNumber) &&
    Number.isFinite(correctionNumber) &&
    targetNumber >= CFCR_TARGET_MIN_KG &&
    targetNumber <= CFCR_TARGET_MAX_KG &&
    correctionNumber >= 0 &&
    correctionNumber <= CFCR_CORRECTION_MAX;
  const exampleCfcr = valid ? EXAMPLE_FCR + (targetNumber - EXAMPLE_WEIGHT_KG) * correctionNumber : null;
  const changed =
    settings.data != null &&
    (targetNumber !== settings.data.targetWeightKg || correctionNumber !== settings.data.correctionFactorPerKg);

  const save = async (values: { targetWeightKg: number; correctionFactorPerKg: number }) => {
    setError("");
    try {
      await update.mutateAsync(values);
      toast.success(t("settings.cfcrStandardSaved"));
    } catch (err: any) {
      setError(err?.response?.data?.message || t("settings.cfcrStandardSaveFailed"));
    }
  };

  const onSave = () => {
    if (!valid) {
      setError(
        t("settings.cfcrStandardInvalid", {
          min: CFCR_TARGET_MIN_KG,
          max: CFCR_TARGET_MAX_KG,
          corrMax: CFCR_CORRECTION_MAX,
        }),
      );
      return;
    }
    void save({ targetWeightKg: targetNumber, correctionFactorPerKg: correctionNumber });
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="font-medium">{t("settings.cfcrStandardTitle")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("settings.cfcrStandardDescription")}</p>
      <p className="mt-2 rounded-md bg-white px-3 py-2 font-mono text-xs text-gray-700">
        cFCR = FCR + ({t("settings.cfcrStandardTarget")} − {t("settings.cfcrStandardAvgWeight")}) × {t("settings.cfcrStandardCorrection")}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cfcr-target">{t("settings.cfcrStandardTargetLabel")}</Label>
          <Input
            id="cfcr-target"
            type="number"
            inputMode="decimal"
            step="any"
            min={CFCR_TARGET_MIN_KG}
            max={CFCR_TARGET_MAX_KG}
            value={target}
            disabled={!canEdit || settings.isLoading || update.isPending}
            onChange={(event) => setTarget(event.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">{t("settings.cfcrStandardTargetHelp")}</p>
        </div>
        <div>
          <Label htmlFor="cfcr-correction">{t("settings.cfcrStandardCorrectionLabel")}</Label>
          <Input
            id="cfcr-correction"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            max={CFCR_CORRECTION_MAX}
            value={correction}
            disabled={!canEdit || settings.isLoading || update.isPending}
            onChange={(event) => setCorrection(event.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">{t("settings.cfcrStandardCorrectionHelp")}</p>
        </div>
      </div>

      {exampleCfcr != null && (
        <p className="mt-3 text-sm text-gray-700">
          {t("settings.cfcrStandardExample", {
            weight: EXAMPLE_WEIGHT_KG.toFixed(1),
            fcr: EXAMPLE_FCR.toFixed(2),
            cfcr: exampleCfcr.toFixed(2),
          })}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {canEdit ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={onSave} disabled={!changed || update.isPending}>
            {update.isPending ? t("settings.updatingFeature") : t("settings.cfcrStandardSave")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={update.isPending || settings.data?.isDefault}
            onClick={() =>
              void save({ targetWeightKg: CFCR_DEFAULT_TARGET_KG, correctionFactorPerKg: CFCR_DEFAULT_CORRECTION_PER_KG })
            }
          >
            {t("settings.cfcrStandardUseDefault")}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">{t("settings.cfcrStandardOwnerOnly")}</p>
      )}
    </div>
  );
}
