"use client";

import { useState } from "react";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { InventoryList } from "@/components/shop/inventory/InventoryList";
import { LedgerList } from "@/components/shop/ledger/LedgerList";
import { Item, LedgerEntry } from "@/types/shop";
import { POSCart } from "@/components/shop/pos/POSCart";
import { PurchaseList } from "@/components/shop/purchases/PurchaseList";
import { PartiesList } from "@/components/shop/parties/PartiesList";
import { ReportsView } from "@/components/shop/reports/ReportsView";
import { SettingsView } from "@/components/shop/settings/SettingsView";
import { getTodayLocalDate } from "@/lib/utils";

export default function LedgerPage() {
  const [active, setActive] = useState("inventory");
  const [items, setItems] = useState<Item[]>([
    { id: "1", sku: "MED-001", name: "Antibiotic Injection", categoryId: "", unit: "pcs", price: 150, stockQty: 10, isActive: true },
    { id: "2", sku: "VIT-025", name: "Vitamin Supplement", categoryId: "", unit: "pcs", price: 80, stockQty: 25, isActive: true },
  ]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([
    { id: "l1", date: "2025-09-10", description: "Opening Balance", debit: 0, credit: 0, balanceAfter: 0 },
  ]);

  function onCreateItem(item: Item) {
    setItems((prev) => [item, ...prev]);
  }

  function onCreateLedger(e: LedgerEntry) {
    setLedger((prev) => [...prev, e]);
  }

  function onDeleteMany(ids: string[]) {
    setLedger((prev) => prev.filter((e) => !ids.includes(e.id)));
  }

  return (
    <ShopLayout
      title="Shop Management"
      headerActions={null}
    >
      <ShopTabs
        tabs={[
          { id: "inventory", label: "Inventory" },
          { id: "pos", label: "POS" },
          { id: "purchases", label: "Purchases" },
          { id: "parties", label: "Parties" },
          { id: "ledger", label: "Ledger" },
          { id: "reports", label: "Reports" },
          { id: "settings", label: "Settings" },
        ]}
        active={active}
        onChange={setActive}
      />

      {active === "inventory" && (
        <InventoryList items={items} onCreate={onCreateItem} />
      )}

      {active === "ledger" && (
        <LedgerList
          entries={ledger}
          onCreate={onCreateLedger}
          onDeleteMany={onDeleteMany}
        />
      )}

      {active === "pos" && (
        <POSCart items={items} />
      )}

      {active === "purchases" && (
        <PurchaseList />
      )}

      {active === "parties" && (
        <PartiesList />
      )}

      {active === "reports" && (
        <ReportsView />
      )}

      {active === "settings" && (
        <SettingsView />
      )}
    </ShopLayout>
  );
}
