"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { useGetCompanySuppliers, type Supplier } from "@/fetchers/company/companySupplierQueries";
import {
  useGetCompanyRawMaterials,
  useCreateRawMaterial,
  type RawMaterial,
} from "@/fetchers/company/companyRawMaterialQueries";
import { useCreateCompanyPurchase } from "@/fetchers/company/companyPurchaseQueries";
import { toast } from "sonner";

interface PurchaseLine {
  rawMaterialId: string;
  rawMaterialName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
}

const formatCurrency = (n: number) =>
  `रू ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function NewPurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSupplierId = searchParams.get("supplierId") ?? "";

  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [addRawMaterialOpen, setAddRawMaterialOpen] = useState(false);
  const [newRawMaterialName, setNewRawMaterialName] = useState("");
  const [newRawMaterialUnit, setNewRawMaterialUnit] = useState("kg");

  const { data: suppliersData } = useGetCompanySuppliers();
  const { data: rawMaterialsData, refetch: refetchRawMaterials } = useGetCompanyRawMaterials();
  const createRawMaterialMutation = useCreateRawMaterial();
  const createMutation = useCreateCompanyPurchase();

  const suppliers: Supplier[] = suppliersData?.data ?? [];
  const rawMaterials: RawMaterial[] = rawMaterialsData?.data ?? [];

  useEffect(() => {
    if (preselectedSupplierId && suppliers.some((s) => s.id === preselectedSupplierId)) {
      setSupplierId(preselectedSupplierId);
    }
  }, [preselectedSupplierId, suppliers]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        rawMaterialId: "",
        rawMaterialName: "",
        unit: "",
        unitPrice: 0,
        quantity: 0,
      },
    ]);
  };

  const updateLine = (index: number, updates: Partial<PurchaseLine>) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const setLineRawMaterial = (index: number, rawMaterialId: string) => {
    const rm = rawMaterials.find((r) => r.id === rawMaterialId);
    if (rm) {
      updateLine(index, {
        rawMaterialId: rm.id,
        rawMaterialName: rm.name,
        unit: rm.unit,
        unitPrice: 0,
        quantity: lines[index]?.quantity || 1,
      });
    }
  };

  const addMoreQuantity = (index: number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: next[index].quantity + 1 };
      return next;
    });
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = lines.reduce(
    (sum, row) => sum + row.quantity * row.unitPrice,
    0
  );
  const validLines = lines.filter(
    (row) => row.rawMaterialId && row.quantity > 0 && row.unitPrice >= 0
  );

  const handleAddRawMaterial = async () => {
    if (!newRawMaterialName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!newRawMaterialUnit.trim()) {
      toast.error("Unit is required");
      return;
    }
    try {
      await createRawMaterialMutation.mutateAsync({
        name: newRawMaterialName.trim(),
        unit: newRawMaterialUnit.trim(),
      });
      toast.success("Raw material added");
      refetchRawMaterials();
      setAddRawMaterialOpen(false);
      setNewRawMaterialName("");
      setNewRawMaterialUnit("kg");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to add raw material");
    }
  };

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error("Select a supplier");
      return;
    }
    if (validLines.length === 0) {
      toast.error("Add at least one raw material with quantity and unit price");
      return;
    }
    try {
      await createMutation.mutateAsync({
        supplierId,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        items: validLines.map((row) => ({
          rawMaterialId: row.rawMaterialId,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
        })),
      });
      toast.success("Purchase recorded");
      router.push(`/company/dashboard/suppliers/${supplierId}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to save purchase");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/company/dashboard/purchases">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add purchase entry</CardTitle>
          <CardDescription>
            Record a purchase of raw materials from a supplier. Stock of raw materials will increase. (These are inputs you buy to use in production later.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Invoice / ref no."
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Raw materials</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddRawMaterialOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add raw material
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add line
              </Button>
            </div>
          </div>

          {lines.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Raw material</th>
                    <th className="text-left p-2 font-medium">Unit</th>
                    <th className="text-left p-2 font-medium">Unit price</th>
                    <th className="text-left p-2 font-medium">Qty</th>
                    <th className="text-right p-2 font-medium">Total</th>
                    <th className="w-[100px] p-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">
                        <Select
                          value={row.rawMaterialId}
                          onValueChange={(v) => setLineRawMaterial(index, v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select raw material" />
                          </SelectTrigger>
                          <SelectContent>
                            {rawMaterials.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">{row.unit || "-"}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 w-24"
                          value={row.unitPrice || ""}
                          onChange={(e) =>
                            updateLine(index, {
                              unitPrice: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          className="h-8 w-20"
                          value={row.quantity || ""}
                          onChange={(e) =>
                            updateLine(index, {
                              quantity: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(row.quantity * row.unitPrice)}
                      </td>
                      <td className="p-2 flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => addMoreQuantity(index)}
                          title="Add more quantity"
                        >
                          +1
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive"
                          onClick={() => removeLine(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rawMaterials.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No raw materials yet. Click &quot;Add raw material&quot; to add one (e.g. Maize, Soybean, kg).
            </p>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <span className="font-medium">Total: {formatCurrency(totalAmount)}</span>
            <Button
              onClick={handleSubmit}
              disabled={
                !supplierId ||
                validLines.length === 0 ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? "Saving..." : "Save purchase"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addRawMaterialOpen} onOpenChange={setAddRawMaterialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add raw material</DialogTitle>
            <DialogDescription>
              Add a raw material you buy from suppliers (e.g. Maize, Soybean). You can then select it when recording purchases.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newRawMaterialName}
                onChange={(e) => setNewRawMaterialName(e.target.value)}
                placeholder="e.g. Maize, Soybean"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Unit *</Label>
              <Input
                value={newRawMaterialUnit}
                onChange={(e) => setNewRawMaterialUnit(e.target.value)}
                placeholder="e.g. kg, L, bag"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRawMaterialOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRawMaterial} disabled={createRawMaterialMutation.isPending}>
              {createRawMaterialMutation.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
