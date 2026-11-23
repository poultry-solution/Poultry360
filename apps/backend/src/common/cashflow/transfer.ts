import { randomUUID } from "crypto";
import type { CashMovementDirection } from "./types";

export interface TransferLeg {
  accountId: string;
  direction: CashMovementDirection;
  amount: number;
  bsDate: string;
  partyName: string;
  transferId: string;
}

/**
 * Build the two movement rows that make up a single transfer. Callers insert
 * both in the same database transaction, sharing the returned `transferId`.
 *
 * - from leg = OUT on the source account
 * - to leg   = IN  on the destination account
 *
 * `category` is always `TRANSFER` at call sites; pure fn stays enum-free so it
 * can be used from scripts without pulling Prisma.
 */
export function buildTransferLegs(params: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  bsDate: string;
  fromName: string;
  toName: string;
  transferId?: string;
}): [TransferLeg, TransferLeg] {
  if (params.fromAccountId === params.toAccountId) {
    throw new Error("Transfer: fromAccountId and toAccountId must differ");
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error("Transfer: amount must be a positive number");
  }
  const transferId = params.transferId ?? randomUUID();
  return [
    {
      accountId: params.fromAccountId,
      direction: "OUT",
      amount: params.amount,
      bsDate: params.bsDate,
      partyName: `Transfer to ${params.toName}`,
      transferId,
    },
    {
      accountId: params.toAccountId,
      direction: "IN",
      amount: params.amount,
      bsDate: params.bsDate,
      partyName: `Transfer from ${params.fromName}`,
      transferId,
    },
  ];
}
