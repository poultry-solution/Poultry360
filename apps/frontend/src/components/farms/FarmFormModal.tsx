"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { useCreateFarm, useUpdateFarm, type FarmInput } from "@/fetchers/farms/farmQueries";
import { useI18n } from "@/i18n/useI18n";

interface FarmFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Edit this farm; leave empty to add a new one. */
  farm?: { id: string; name: string; capacity: number; description: string | null };
  onSaved?: (farmId: string) => void;
}

type Errors = Partial<Record<"name" | "capacity", string>>;

export function FarmFormModal({ isOpen, onClose, farm, onSaved }: FarmFormModalProps) {
  const { t } = useI18n();
  const createFarm = useCreateFarm();
  const updateFarm = useUpdateFarm();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const saving = createFarm.isPending || updateFarm.isPending;

  useEffect(() => {
    if (!isOpen) return;
    setName(farm?.name ?? "");
    setCapacity(farm ? String(farm.capacity) : "");
    setDescription(farm?.description ?? "");
    setErrors({});
  }, [isOpen, farm]);

  const validate = (): FarmInput | null => {
    const next: Errors = {};
    const cap = Number(capacity);
    if (!name.trim()) next.name = t("farmer.farms.form.nameRequired");
    if (!capacity || !Number.isInteger(cap) || cap < 1) next.capacity = t("farmer.farms.form.capacityInvalid");
    setErrors(next);
    if (Object.keys(next).length) return null;
    return { name: name.trim(), capacity: cap, description: description.trim() || null };
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const input = validate();
    if (!input) return;
    try {
      const result = farm
        ? await updateFarm.mutateAsync({ id: farm.id, data: input })
        : await createFarm.mutateAsync(input);
      toast.success(farm ? t("farmer.farms.form.updated") : t("farmer.farms.form.created"));
      onSaved?.(result?.data?.id ?? farm?.id);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("farmer.farms.form.saveFailed"));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={farm ? t("farmer.farms.form.editTitle") : t("farmer.farms.form.addTitle")}
    >
      <form onSubmit={submit}>
        <ModalContent>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="farm-name">{t("farmer.farms.form.name")}</Label>
              <Input
                id="farm-name"
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("farmer.farms.form.namePlaceholder")}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="farm-capacity">{t("farmer.farms.form.capacity")}</Label>
              <Input
                id="farm-capacity"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                placeholder="5000"
                aria-invalid={!!errors.capacity}
              />
              {errors.capacity ? (
                <p className="text-xs text-red-600">{errors.capacity}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{t("farmer.farms.form.capacityHint")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="farm-description">{t("farmer.farms.form.description")}</Label>
              <Textarea
                id="farm-description"
                rows={2}
                maxLength={500}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("farmer.farms.form.descriptionPlaceholder")}
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("farmer.farms.form.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {farm ? t("farmer.farms.form.save") : t("farmer.farms.form.create")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
