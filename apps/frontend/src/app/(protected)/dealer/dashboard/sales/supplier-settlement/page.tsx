"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { useSearchableDealerProductSelect } from "@/hooks/useSearchableDealerProductSelect";
import { getTodayLocalDate } from "@/common/lib/utils";
import { ACCOUNT_FEATURE_KEYS, useAccountFeature } from "@/fetchers/accountFeatureQueries";
import { useGetManualCompanies } from "@/fetchers/dealer/dealerManualCompanyQueries";
import { useCreateSupplierSettlementSale } from "@/fetchers/dealer/dealerSaleQueries";

type SettlementItem = {
  productId: string;
  productName: string;
  unit: string;
  stock: number;
  quantity: number;
  unitPrice: number;
};

export default function SupplierSettlementSalePage() {
  const router = useRouter();
  const feature = useAccountFeature(ACCOUNT_FEATURE_KEYS.DEALER_SUPPLIER_SETTLEMENT_SALES);
  const { data: companies = [], isLoading: companiesLoading } = useGetManualCompanies({ archived: false });
  const productSelect = useSearchableDealerProductSelect();
  const createSale = useCreateSupplierSettlementSale();

  const [manualCompanyId, setManualCompanyId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [date, setDate] = useState(getTodayLocalDate());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!feature.isLoading && !feature.isEnabled) {
      router.replace("/dealer/dashboard/sales");
    }
  }, [feature.isEnabled, feature.isLoading, router]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === manualCompanyId),
    [companies, manualCompanyId]
  );
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const addProduct = (productId: string, option?: any) => {
    if (items.some((item) => item.productId === productId)) {
      toast.error("This inventory product is already included");
      return;
    }
    const product = option?.data;
    if (!product || Number(product.currentStock) <= 0) {
      toast.error("Choose an active inventory product with stock available");
      return;
    }

    setItems((current) => [
      ...current,
      {
        productId,
        productName: product.name,
        unit: product.unit || "unit",
        stock: Number(product.currentStock),
        quantity: 1,
        unitPrice: Number(product.sellingPrice) || 0,
      },
    ]);
    setSelectedProductId("");
  };

  const updateItem = (index: number, field: "quantity" | "unitPrice", value: string) => {
    const parsed = Number(value);
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: Number.isFinite(parsed) ? parsed : 0 } : item
    )));
  };

  const submit = async () => {
    if (!manualCompanyId) {
      toast.error("Select the Manual Company supplier");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one inventory item");
      return;
    }
    for (const item of items) {
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        toast.error("Every item needs a positive quantity and rate");
        return;
      }
      if (item.quantity > item.stock) {
        toast.error(`${item.productName} has only ${item.stock} ${item.unit} in stock`);
        return;
      }
    }

    try {
      const result = await createSale.mutateAsync({
        manualCompanyId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
        })),
        date: new Date(`${date || getTodayLocalDate()}T12:00:00`),
        notes: notes.trim() || undefined,
      });
      toast.success("Supplier balance settled with inventory sale");
      router.push(`/dealer/dashboard/sales/${result.data.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not create supplier settlement sale");
    }
  };

  if (feature.isLoading || !feature.isEnabled) {
    return <div className="min-h-[240px]" aria-hidden="true" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back to sales">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sell to company</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Supply inventory to a Manual Company and settle its outstanding balance instead of recording a cash payment.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Supplier</CardTitle>
              <CardDescription>Only active Manual Company suppliers can receive a settlement sale.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Manual Company supplier</Label>
                <Select value={manualCompanyId} onValueChange={setManualCompanyId} disabled={companiesLoading}>
                  <SelectTrigger><SelectValue placeholder={companiesLoading ? "Loading suppliers..." : "Choose a supplier"} /></SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name} · balance: रू {Number(company.balance).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCompany ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <span className="font-medium">Current supplier balance: </span>
                  रू {Number(selectedCompany.balance).toFixed(2)}
                  <span className="block pt-1 text-xs text-amber-900">A sale above this balance creates a supplier advance (negative balance).</span>
                </div>
              ) : null}
              {companies.length === 0 && !companiesLoading ? (
                <p className="text-sm text-muted-foreground">Create an active Manual Company supplier before recording a settlement sale.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Inventory items</CardTitle>
              <CardDescription>Rates begin with the saved selling price and can be adjusted for this sale.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SearchableSelect
                value={selectedProductId}
                onValueChange={addProduct}
                options={productSelect.options}
                placeholder="Search active inventory products..."
                searchPlaceholder="Search inventory..."
                emptyText="No in-stock inventory products found"
                isLoading={productSelect.isLoading}
                onSearch={productSelect.onSearch}
              />

              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Add the inventory items you are supplying.</div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.productId} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_110px_130px_auto] sm:items-end">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">Available: {item.stock} {item.unit}</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`settlement-quantity-${index}`}>Quantity</Label>
                        <Input id={`settlement-quantity-${index}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`settlement-rate-${index}`}>Rate</Label>
                        <Input id={`settlement-rate-${index}`} type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} />
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${item.productName}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="sm:col-span-4 text-right text-sm font-medium">Line total: रू {(item.quantity * item.unitPrice).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sale details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settlement-date">Date</Label>
                <Input id="settlement-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlement-notes">Notes (optional)</Label>
                <Textarea id="settlement-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional reference or delivery details" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>Settlement summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Items</span><span>{items.length}</span></div>
            <div className="flex justify-between border-t pt-3"><span className="font-medium">Settlement value</span><span className="text-xl font-bold">रू {total.toFixed(2)}</span></div>
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">No cash payment or customer record will be created. This amount directly reduces the selected supplier&apos;s balance.</p>
            <Button className="w-full" onClick={submit} disabled={createSale.isPending || !manualCompanyId || items.length === 0}>
              {createSale.isPending ? "Recording..." : "Record supplier settlement sale"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
