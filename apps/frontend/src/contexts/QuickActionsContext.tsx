"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface QuickActionsHandlers {
  onAddExpense?: () => void;
  onAddSale?: () => void;
  onAddMortality?: () => void;
  onRecordWeight?: () => void;
}

interface QuickActionsContextType {
  handlers: QuickActionsHandlers;
  setHandlers: (handlers: QuickActionsHandlers) => void;
}

const QuickActionsContext = createContext<QuickActionsContextType | undefined>(
  undefined
);

export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const [handlers, setHandlers] = useState<QuickActionsHandlers>({});

  return (
    <QuickActionsContext.Provider value={{ handlers, setHandlers }}>
      {children}
    </QuickActionsContext.Provider>
  );
}

export function useQuickActions() {
  const context = useContext(QuickActionsContext);
  if (!context) {
    throw new Error("useQuickActions must be used within QuickActionsProvider");
  }
  return context;
}

