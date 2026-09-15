export interface MaterialProductionInputLine {
  id: string;
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
  amount: number;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    supplierKey?: string | null;
  };
}

export interface MaterialProductionOutputLine {
  id: string;
  productId: string;
  inventoryItemId: string;
  quantity: number;
  costAllocationPercent: number;
  unitCost: number;
  amount: number;
  product: {
    id: string;
    name: string;
    unit: string;
    outputItemType?: string;
  };
}

export interface MaterialProductionRun {
  id: string;
  date: string;
  referenceNumber: string | null;
  notes: string | null;
  inputs: MaterialProductionInputLine[];
  outputs: MaterialProductionOutputLine[];
  createdAt: string;
}

export interface CreateMaterialProductionInput {
  date?: string;
  referenceNumber?: string;
  notes?: string;
  inputs: Array<{ inventoryItemId: string; quantity: number }>;
  outputs: Array<{
    productId: string;
    quantity: number;
    costAllocationPercent: number;
  }>;
}
