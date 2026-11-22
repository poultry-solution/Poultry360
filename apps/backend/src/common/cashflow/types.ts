import {
  AccountType,
  CashCategory,
  CashMovementDirection,
  CashSourceType,
} from "@prisma/client";

export { AccountType, CashCategory, CashMovementDirection, CashSourceType };

export interface CashAccount {
  id: string;
  userId: string;
  type: AccountType;
  name: string;
  openingBalance: number;
  openingBsDate: string;
  archivedAt: Date | null;
}

export interface CashMovement {
  id: string;
  userId: string;
  accountId: string;
  bsDate: string;
  direction: CashMovementDirection;
  amount: number;
  category: CashCategory;
  sourceType: CashSourceType;
  sourceId: string | null;
  transferId: string | null;
  partyName: string;
  notes: string | null;
  createdAt: Date;
}

export interface BsDateRange {
  fromBsDate: string;
  toBsDate: string;
}
