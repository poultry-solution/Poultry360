"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { useGetCompanySuppliers, useCreateSupplier, type Supplier } from "@/fetchers/company/companySupplierQueries";
import { toast } from "sonner";

export default function CompanySuppliersPage() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");

  const { data: suppliersData, isLoading } = useGetCompanySuppliers();
  const createMutation = useCreateSupplier();

  const suppliers: Supplier[] = suppliersData?.data ?? [];

  const handleAddSupplier = async () => {
    if (!name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        contact: contact.trim() || undefined,
        address: address.trim() || undefined,
      });
      toast.success("Supplier added");
      setAddOpen(false);
      setName("");
      setContact("");
      setAddress("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to add supplier");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Supplier Ledger</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage suppliers and view purchase history and balance
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">Suppliers</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {suppliers.length} supplier(s). Select one to view ledger and add purchases.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : suppliers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No suppliers yet. Add a supplier to start recording purchases.
            </div>
          ) : (
            <div className="divide-y">
              {suppliers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => router.push(`/company/dashboard/suppliers/${s.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{s.name}</span>
                  {s.contact && (
                    <span className="text-sm text-muted-foreground">{s.contact}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
            <DialogDescription>Add a new supplier to record purchases and track balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Supplier name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact">Contact (optional)</Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Phone or email"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="address">Address (optional)</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSupplier} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
