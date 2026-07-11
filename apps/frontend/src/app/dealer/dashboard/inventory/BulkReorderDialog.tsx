"use client";

import { useState, useMemo } from "react";
import Calendar from "@sbmdkl/nepali-datepicker-reactjs";
import "@sbmdkl/nepali-datepicker-reactjs/dist/index.css";
import { X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  useGetDealerProducts,
  type DealerProduct,
} from "@/fetchers/dealer/dealerProductQueries";
import {
  useGetManualCompanies,
  useRecordManualPurchase,
  type ManualCompany,
} from "@/fetchers/dealer/dealerManualCompanyQueries";
import { getTodayLocalDate } from "@/common/lib/utils";
import { convertADtoBS } from "@/common/lib/nepali-date";
import { toast } from "sonner";

interface SelectedItem {
  product: DealerProduct;
  quantity: string;
}

interface BulkReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkReorderDialog({ open, onOpenChange }: BulkReorderDialogProps) {
  const [step, setStep] = useState<"select" | "details">("select");
  const [companyId, setCompanyId] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [dialogShowHidden, setDialogShowHidden] = useState(false);
  const [dateAd, setDateAd] = useState(getTodayLocalDate());
  const [tradeDiscount, setTradeDiscount] = useState<string>("0");
  const [dialogSearch, setDialogSearch] = useState("");

  const { data: companiesData } = useGetManualCompanies();
  const companies = companiesData || [];
  const activeCompanies = companies.filter((c: ManualCompany) => !c.archivedAt);

  const { data: productsData } = useGetDealerProducts({
    limit: 500,
    includeHidden: dialogShowHidden,
  });
  const allProducts: DealerProduct[] = productsData?.data || [];

  const companyProducts = useMemo(() => {
    if (!companyId) return [];
    return allProducts.filter((p) => {
      if (p.manualCompanyId !== companyId) return false;
      if (!dialogShowHidden && p.hiddenAt) return false;
      if (dialogSearch) {
        const q = dialogSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allProducts, companyId, dialogShowHidden, dialogSearch]);

  const selectedIds = new Set(selectedItems.map((si) => si.product.id));

  const basicTotal = useMemo(() => {
    return selectedItems.reduce((sum, si) => {
      const qty = Number(si.quantity) || 0;
      return sum + qty * Number(si.product.costPrice);
    }, 0);
  }, [selectedItems]);

  const discountNum = Math.max(0, Number(tradeDiscount) || 0);
  const netTotal = Math.max(0, basicTotal - discountNum);

  const recordPurchaseMutation = useRecordManualPurchase();

  const resetState = () => {
    setStep("select");
    setCompanyId("");
    setSelectedItems([]);
    setDialogShowHidden(false);
    setDateAd(getTodayLocalDate());
    setTradeDiscount("0");
    setDialogSearch("");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const toggleItem = (product: DealerProduct) => {
    if (selectedIds.has(product.id)) {
      setSelectedItems((prev) => prev.filter((si) => si.product.id !== product.id));
    } else {
      setSelectedItems((prev) => [...prev, { product, quantity: "" }]);
    }
  };

  const updateQuantity = (productId: string, value: string) => {
    setSelectedItems((prev) =>
      prev.map((si) => (si.product.id === productId ? { ...si, quantity: value } : si))
    );
  };

  const removeItem = (productId: string) => {
    setSelectedItems((prev) => prev.filter((si) => si.product.id !== productId));
  };

  const handleGoToDetails = () => {
    if (!companyId) {
      toast.error("Please select a company");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Please select at least one product");
      return;
    }
    setStep("details");
  };

  const handleSubmit = async () => {
    const invalidItems = selectedItems.filter((si) => {
      const qty = Number(si.quantity);
      return !qty || isNaN(qty) || qty <= 0;
    });
    if (invalidItems.length > 0) {
      toast.error("Please enter a valid quantity for all items");
      return;
    }
    if (discountNum > basicTotal) {
      toast.error("Trade discount cannot exceed the basic total");
      return;
    }

    try {
      await recordPurchaseMutation.mutateAsync({
        companyId,
        date: new Date((dateAd || getTodayLocalDate()) + "T12:00:00").toISOString(),
        tradeDiscountAmount: discountNum || 0,
        items: selectedItems.map((si) => ({
          productName: si.product.name,
          type: si.product.type,
          unit: si.product.unit,
          quantity: Number(si.quantity),
          costPrice: Number(si.product.costPrice),
          sellingPrice: Number(si.product.sellingPrice),
        })),
      });
      toast.success("Purchase recorded successfully");
      handleClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to record purchase");
    }
  };

  const defaultBsDate = (): string => {
    try {
      return convertADtoBS(dateAd || getTodayLocalDate());
    } catch {
      return convertADtoBS(getTodayLocalDate());
    }
  };

  const selectedCompany = activeCompanies.find((c: ManualCompany) => c.id === companyId);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Reorder — Select Items" : "Reorder — Purchase Details"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select
                value={companyId}
                onValueChange={(v) => {
                  setCompanyId(v);
                  setSelectedItems([]);
                  setDialogSearch("");
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select a manual company" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {activeCompanies.map((c: ManualCompany) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {companyId && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Search products..."
                      value={dialogSearch}
                      onChange={(e) => setDialogSearch(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={dialogShowHidden}
                      onChange={(e) => setDialogShowHidden(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    Show hidden
                  </label>
                </div>

                <div className="border rounded-md max-h-[40vh] overflow-y-auto">
                  {companyProducts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No products found for this company
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 sticky top-0">
                        <tr>
                          <th className="w-10 p-2" />
                          <th className="text-left p-2 font-medium">Product</th>
                          <th className="text-left p-2 font-medium">Type</th>
                          <th className="text-right p-2 font-medium">Cost</th>
                          <th className="text-right p-2 font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyProducts.map((product) => {
                          const checked = selectedIds.has(product.id);
                          return (
                            <tr
                              key={product.id}
                              className={`border-t cursor-pointer hover:bg-muted/20 ${checked ? "bg-primary/5" : ""}`}
                              onClick={() => toggleItem(product)}
                            >
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleItem(product)}
                                  className="h-4 w-4"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="p-2">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground">{product.unit}</div>
                              </td>
                              <td className="p-2">
                                <Badge variant="secondary" className="text-xs">{product.type}</Badge>
                              </td>
                              <td className="p-2 text-right">रू {Number(product.costPrice).toFixed(2)}</td>
                              <td className="p-2 text-right">{Number(product.currentStock).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {selectedItems.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleGoToDetails} disabled={!companyId || selectedItems.length === 0}>
                Next
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Company:</span>
              <span className="font-medium">{selectedCompany?.name}</span>
              <span className="text-muted-foreground">
                ({selectedItems.length} item{selectedItems.length > 1 ? "s" : ""})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Calendar
                  onChange={({ adDate }: { bsDate: string; adDate: string }) => {
                    const ymd = adDate.includes("T") ? adDate.split("T")[0] : adDate;
                    setDateAd(ymd);
                  }}
                  defaultDate={defaultBsDate() as any}
                  className="w-full rounded-md border border-input"
                  theme="dark"
                  language="en"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Trade Discount (NPR)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tradeDiscount}
                  onChange={(e) => setTradeDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="border rounded-md divide-y max-h-[35vh] overflow-y-auto">
              {selectedItems.map((si) => (
                <div key={si.product.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{si.product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {si.product.type} &middot; {si.product.unit} &middot;
                      Cost: रू {Number(si.product.costPrice).toFixed(2)} &middot;
                      Sell: रू {Number(si.product.sellingPrice).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground sr-only">Qty</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Qty"
                      value={si.quantity}
                      onChange={(e) => updateQuantity(si.product.id, e.target.value)}
                      className="w-24 h-8 text-sm text-right"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(si.product.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-md bg-muted/30 border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic total</span>
                <span>रू {basicTotal.toFixed(2)}</span>
              </div>
              {discountNum > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Trade discount</span>
                  <span>- रू {discountNum.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Net total</span>
                <span>रू {netTotal.toFixed(2)}</span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>Back</Button>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={recordPurchaseMutation.isPending || selectedItems.length === 0}
              >
                {recordPurchaseMutation.isPending ? "Saving..." : "Record Purchase"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
