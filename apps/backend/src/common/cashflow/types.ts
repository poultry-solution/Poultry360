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
  /**
   * Null until the farmer confirms their opening balance for the first time.
   * Drives the "Set your starting Cash balance" banner on the cashflow page.
   * Only meaningful for CASH accounts; BANK rows are created with explicit
   * opening values and leave this null.
   */
  openingBalanceSetAt: Date | null;
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
  /**
   * Set on list responses only. False when the money is already inside the
   * account's opening amount (dated before the start day, or saved before the
   * farmer counted their cash), so it does not change the balance.
   */
  countedInBalance?: boolean;
}

export interface BsDateRange {
  fromBsDate: string;
  toBsDate: string;
}
