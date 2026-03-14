"use client";

import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { useI18n } from "@/i18n/useI18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Loader2 } from "lucide-react";
import { DateInput } from "@/common/components/ui/date-input";

type ExpenseCategory = "Feed" | "Medicine" | "Other";

interface ExpenseFormState {
  category: ExpenseCategory;
  date: string;
  notes: string;
  feedBrand: string;
  feedQuantity: string;
  feedRate: string;
  selectedFeedId: string;
  medicineName: string;
  medicineRate: string;
  medicineQuantity: string;
  selectedMedicineId: string;
  selectedOtherId: string;
  otherName: string;
  otherRate: string;
  otherQuantity: string;
  extraName?: string;
  extraAmount?: string;
  farmId?: string;
  batchId?: string;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Context props (optional)
  prefilledBatchId?: string;
  prefilledFarmId?: string;
  
  // Selection data (required only if no prefilled context)
  farms?: any[];
  activeBatches?: any[];
  
  // Form state
  editingExpenseId: number | null;
  expenseForm: ExpenseFormState;
  expenseErrors: Record<string, string>;
  
  // Data
  expenseCategories: any[];
  feedInventory: any[];
  medicineInventory: any[];
  otherInventory?: any[];
  inventoryItems: any[];
  
  // Handlers
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onFieldUpdate: (e: React.ChangeEvent<any>) => void;
  onFeedSelection: (id: string) => void;
  onMedicineSelection: (id: string) => void;
  onOtherSelection?: (id: string) => void;
  
  // Loading
  isPending: boolean;
}

export function ExpenseModal({
  isOpen,
  onClose,
  prefilledBatchId,
  prefilledFarmId,
  farms,
  activeBatches,
  editingExpenseId,
  expenseForm,
  expenseErrors,
  expenseCategories,
  feedInventory,
  medicineInventory,
  otherInventory = [],
  inventoryItems,
  onSubmit,
  onFieldUpdate,
  onFeedSelection,
  onMedicineSelection,
  onOtherSelection,
  isPending,
}: ExpenseModalProps) {
  const { t } = useI18n();
  const showBatchSelector = !prefilledBatchId;
  const showFarmSelector = !prefilledFarmId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingExpenseId ? t("farmer.dashboard.modals.expense.editTitle") : t("farmer.dashboard.modals.expense.title")}
    >
      <form onSubmit={onSubmit}>
        <ModalContent className="space-y-6 pb-1">
          {/* Context: Farm & Batch */}
          {(showFarmSelector || showBatchSelector) && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">{t("farmer.dashboard.modals.expense.context")}</p>
              <div className="flex flex-col gap-5">
                {showFarmSelector && (
                  <div className="space-y-2">
                    <Label htmlFor="farmId" className="text-sm font-medium text-foreground">
                      {t("farmer.dashboard.modals.expense.farm")}
                    </Label>
                    <Select
                      value={expenseForm.farmId || ""}
                      onValueChange={(v) =>
                        onFieldUpdate({ target: { name: "farmId", value: v } } as React.ChangeEvent<HTMLInputElement>)
                      }
                    >
                      <SelectTrigger className="h-10 w-full rounded-lg !bg-white">
                        <SelectValue placeholder={t("farmer.dashboard.modals.expense.selectFarm")} />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {farms?.map((farm: any) => (
                          <SelectItem key={farm.id} value={farm.id}>
                            {farm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {expenseErrors.farmId && (
                      <p className="text-xs text-destructive mt-1.5">{expenseErrors.farmId}</p>
                    )}
                  </div>
                )}
                {showBatchSelector && (
                  <div className="space-y-2">
                    <Label htmlFor="batchId" className="text-sm font-medium text-foreground">
                      {t("farmer.dashboard.modals.expense.batch")}
                    </Label>
                    <Select
                      value={expenseForm.batchId || ""}
                      onValueChange={(v) =>
                        onFieldUpdate({ target: { name: "batchId", value: v } } as React.ChangeEvent<HTMLInputElement>)
                      }
                    >
                      <SelectTrigger className="h-10 w-full rounded-lg !bg-white">
                        <SelectValue placeholder={t("farmer.dashboard.modals.expense.selectBatch")} />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {activeBatches?.map((batch: any) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.batchNumber ?? batch.number} - {batch.farm?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {expenseErrors.batchId && (
                      <p className="text-xs text-destructive mt-1.5">{expenseErrors.batchId}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category & Date */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">{t("farmer.dashboard.modals.expense.categoryAndDate")}</p>
            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-foreground">
                  {t("farmer.dashboard.modals.expense.category")}
                </Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(v) =>
                    onFieldUpdate({
                      target: { name: "category", value: v as ExpenseCategory },
                    } as React.ChangeEvent<HTMLInputElement>)
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-lg !bg-white">
                    <SelectValue placeholder={t("farmer.dashboard.modals.expense.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Feed">{t("farmer.dashboard.modals.expense.feedFromInventory")}</SelectItem>
                    <SelectItem value="Medicine">{t("farmer.dashboard.modals.expense.medicineFromInventory")}</SelectItem>
                    <SelectItem value="Other">{t("farmer.dashboard.modals.expense.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <DateInput
                  label={t("farmer.dashboard.modals.expense.date")}
                  value={expenseForm.date}
                  onChange={(value) => onFieldUpdate({ target: { name: "date", value } } as React.ChangeEvent<HTMLInputElement>)}
                />
                {expenseErrors.date && (
                  <p className="text-xs text-destructive mt-1.5">{expenseErrors.date}</p>
                )}
              </div>
            </div>
          </div>

          {/* Category-specific details */}
          {expenseForm.category === "Feed" && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
              <p className="text-sm font-medium text-foreground">{t("farmer.dashboard.modals.expense.feedDetails")}</p>
              <div className="flex flex-col gap-5">
                <div className="space-y-2">
                  <Label htmlFor="selectedFeedId" className="text-sm font-medium text-foreground">
                    {t("farmer.dashboard.modals.expense.feedFromInventory")}
                  </Label>
                  <Select
                    value={expenseForm.selectedFeedId || ""}
                    onValueChange={onFeedSelection}
                  >
                    <SelectTrigger className="h-10 w-full rounded-lg !bg-white">
                      <SelectValue placeholder={t("farmer.dashboard.modals.expense.selectFeedFromInventory")} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {(feedInventory ?? []).map((feed: any) => (
                        <SelectItem key={feed.id} value={feed.id}>
                          {feed.name} ({(feed.quantity ?? feed.currentStock ?? 0)} {feed.unit} available)
                          {feed.rate != null ? ` - ₹${feed.rate}/unit` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {expenseErrors.feedBrand && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.feedBrand}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedQuantity" className="text-sm font-medium text-foreground">
                    {t("farmer.dashboard.modals.expense.quantity")}
                  </Label>
                  <Input
                    id="feedQuantity"
                    name="feedQuantity"
                    type="number"
                    value={expenseForm.feedQuantity}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.feedQuantity && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.feedQuantity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedRate" className="text-sm font-medium text-foreground">
                    {t("farmer.dashboard.modals.expense.ratePerUnit")}
                  </Label>
                  <Input
                    id="feedRate"
                    name="feedRate"
                    type="number"
                    value={expenseForm.feedRate}
                    onChange={onFieldUpdate}
                    readOnly={!!expenseForm.selectedFeedId}
                    className={`rounded-lg ${expenseForm.selectedFeedId ? "bg-muted/50 cursor-default" : ""}`}
                    placeholder={
                      expenseForm.selectedFeedId ? t("farmer.dashboard.modals.expense.autoFilledFromInventory") : t("farmer.dashboard.modals.expense.enterRate")
                    }
                  />
                  {expenseErrors.feedRate && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.feedRate}</p>
                  )}
                  {expenseForm.selectedFeedId && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                      {t("farmer.dashboard.modals.expense.rateAutoFilledFromInventory")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {expenseForm.category === "Medicine" && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
              <p className="text-sm font-medium text-foreground">{t("farmer.dashboard.modals.expense.medicineDetails")}</p>
              <div className="flex flex-col gap-5">
                <div className="space-y-2">
                  <Label htmlFor="selectedMedicineId" className="text-sm font-medium text-foreground">
                    {t("farmer.dashboard.modals.expense.medicineFromInventory")}
                  </Label>
                  <Select
                    value={expenseForm.selectedMedicineId || ""}
                    onValueChange={onMedicineSelection}
                  >
                    <SelectTrigger className="h-10 w-full rounded-lg !bg-white">
                      <SelectValue placeholder={t("farmer.dashboard.modals.expense.selectMedicineFromInventory")} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {(medicineInventory ?? []).map((medicine: any) => (
                        <SelectItem key={medicine.id} value={medicine.id}>
                          {medicine.name} ({(medicine.quantity ?? medicine.currentStock ?? 0)} {medicine.unit} available)
                          {medicine.rate != null ? ` - ₹${medicine.rate}/unit` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {expenseErrors.medicineName && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.medicineName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicineQuantity" className="text-sm font-medium text-foreground">
                    {t("farmer.dashboard.modals.expense.quantity")}
                  </Label>
                  <Input
                    id="medicineQuantity"
                    name="medicineQuantity"
                    type="number"
                    value={expenseForm.medicineQuantity}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.medicineQuantity && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.medicineQuantity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicineRate" className="text-sm font-medium text-foreground">
                    {t("farmer.dashboard.modals.expense.ratePerUnit")}
                  </Label>
                  <Input
                    id="medicineRate"
                    name="medicineRate"
                    type="number"
                    value={expenseForm.medicineRate}
                    onChange={onFieldUpdate}
                    readOnly={!!expenseForm.selectedMedicineId}
                    className={`rounded-lg ${expenseForm.selectedMedicineId ? "bg-muted/50 cursor-default" : ""}`}
                    placeholder={
                      expenseForm.selectedMedicineId ? t("farmer.dashboard.modals.expense.autoFilledFromInventory") : t("farmer.dashboard.modals.expense.enterRate")
                    }
                  />
                  {expenseErrors.medicineRate && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.medicineRate}</p>
                  )}
                  {expenseForm.selectedMedicineId && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                      {t("farmer.dashboard.modals.expense.rateAutoFilledFromInventory")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {expenseForm.category === "Other" && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
              <p className="text-sm font-medium text-foreground">{t("farmer.dashboard.modals.expense.otherExpenseDetails")}</p>
              <div className="flex flex-col gap-5">
                {otherInventory.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="selectedOtherId" className="text-sm font-medium text-foreground">
                      {t("farmer.dashboard.modals.expense.otherFromInventory")}
                    </Label>
                    <Select
                      value={expenseForm.selectedOtherId || "__none__"}
                      onValueChange={(v) => onOtherSelection?.(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="h-10 w-full rounded-lg !bg-white">
                        <SelectValue placeholder={t("farmer.dashboard.modals.expense.enterManuallyBelow")} />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="__none__">{t("farmer.dashboard.modals.expense.enterManuallyBelow")}</SelectItem>
                        {(otherInventory ?? []).map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({(item.quantity ?? item.currentStock ?? 0)} {item.unit} available)
                            {item.rate != null ? ` - ₹${item.rate}/unit` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!expenseForm.selectedOtherId && (
                  <div className="space-y-2">
                    <Label htmlFor="otherName" className="text-sm font-medium text-foreground">
                      {t("farmer.dashboard.modals.expense.expenseName")}
                    </Label>
                    <Input
                      id="otherName"
                      name="otherName"
                      value={expenseForm.otherName}
                      onChange={onFieldUpdate}
                      className="rounded-lg"
                    />
                    {expenseErrors.otherName && (
                      <p className="text-xs text-destructive mt-1.5">{expenseErrors.otherName}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="otherQuantity" className="text-sm font-medium text-foreground">
                    {t("farmer.dashboard.modals.expense.quantity")}
                  </Label>
                  <Input
                    id="otherQuantity"
                    name="otherQuantity"
                    type="number"
                    value={expenseForm.otherQuantity}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.otherQuantity && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.otherQuantity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherRate" className="text-sm font-medium text-foreground">
                    {t("farmer.dashboard.modals.expense.ratePerUnit")}
                  </Label>
                  <Input
                    id="otherRate"
                    name="otherRate"
                    type="number"
                    value={expenseForm.otherRate}
                    onChange={onFieldUpdate}
                    readOnly={!!expenseForm.selectedOtherId}
                    className={`rounded-lg ${expenseForm.selectedOtherId ? "bg-muted/50 cursor-default" : ""}`}
                    placeholder={
                      expenseForm.selectedOtherId ? t("farmer.dashboard.modals.expense.autoFilledFromInventory") : t("farmer.dashboard.modals.expense.enterRate")
                    }
                  />
                  {expenseErrors.otherRate && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.otherRate}</p>
                  )}
                  {expenseForm.selectedOtherId && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                      {t("farmer.dashboard.modals.expense.rateAutoFilledStockDeducted")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter className="flex flex-row justify-end gap-3 pt-2 border-t border-border/60">
          <Button type="button" variant="outline" onClick={onClose} className="min-w-[84px]">
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 min-w-[84px]"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editingExpenseId ? t("farmer.dashboard.modals.expense.updating") : t("farmer.dashboard.modals.expense.creating")}
              </>
            ) : (
              editingExpenseId ? t("farmer.dashboard.modals.expense.update") : t("common.save")
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
