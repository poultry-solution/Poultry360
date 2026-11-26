"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import type { CashAccountOption } from "@/fetchers/farmer/farmerCashflowQueries";

interface AccountPickerProps {
  /** Full CashAccount rows work too — the picker only reads id, name, type, archivedAt. */
  accounts: CashAccountOption[];
  value: string;
  onChange: (id: string) => void;
  /** Hide the picker entirely when there's only one usable account (just Cash). */
  autoHideSingleCash?: boolean;
  disabledIds?: string[];
  placeholder?: string;
  includeArchived?: boolean;
}

export function AccountPicker({
  accounts,
  value,
  onChange,
  autoHideSingleCash = false,
  disabledIds = [],
  placeholder = "Select account",
  includeArchived = false,
}: AccountPickerProps) {
  const usable = accounts.filter((a) =>
    includeArchived ? true : a.archivedAt === null,
  );

  if (
    autoHideSingleCash &&
    usable.length === 1 &&
    usable[0].type === "CASH"
  ) {
    return null;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {usable.map((a) => (
          <SelectItem
            key={a.id}
            value={a.id}
            disabled={disabledIds.includes(a.id)}
          >
            <span className="flex items-center gap-2">
              <span>{a.name}</span>
              {a.archivedAt && (
                <span className="text-xs text-muted-foreground">
                  (archived)
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
