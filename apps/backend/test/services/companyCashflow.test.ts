/**
 * Company Cash & Bank: auto-post helpers, dealer ownership check and the
 * dealer payment delete (balance, later "Balance" snapshots, Cash & Bank
 * entry). Prisma is mocked.
 */

jest.mock("../../src/utils/nepalBsDate", () => ({
  toNepalBsDayString: jest.fn(() => "2083-08-11"),
}));
jest.mock("../../src/utils/prisma", () => {
  const client: any = { $transaction: jest.fn() };
  return { __esModule: true, default: client };
});

import { Prisma } from "@prisma/client";
import prisma from "../../src/utils/prisma";
import { CashflowError } from "../../src/common/cashflow/errors";
import {
  deleteCompanySupplierPaymentMovements,
  postCompanyDealerPaymentMovement,
  postCompanySupplierPaymentMovement,
  resolveCompanyPaymentAccount,
} from "../../src/services/companyCashflowAutoPost";
import {
  assertCompanyDealer,
  CompanyDealerAccountService,
} from "../../src/services/companyDealerAccountService";

function makeTx(): any {
  return {
    cashAccount: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    cashMovement: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
    user: { findUnique: jest.fn() },
    dealer: { findUnique: jest.fn() },
    companyDealerAccount: { findUnique: jest.fn(), update: jest.fn() },
    companyDealerPayment: { findUnique: jest.fn(), findFirst: jest.fn(), delete: jest.fn(), updateMany: jest.fn() },
  };
}

describe("resolveCompanyPaymentAccount", () => {
  it("uses Cash when no account is sent", async () => {
    const tx = makeTx();
    tx.cashAccount.findFirst.mockResolvedValue({ id: "cash-1" });
    tx.cashAccount.findUnique.mockResolvedValue({ userId: "owner-1", type: "CASH", archivedAt: null });
    await expect(resolveCompanyPaymentAccount(tx, "owner-1", null)).resolves.toEqual({
      accountId: "cash-1",
      paymentMethod: "CASH",
    });
  });

  it("a bank account gives BANK_TRANSFER", async () => {
    const tx = makeTx();
    tx.cashAccount.findUnique.mockResolvedValue({ userId: "owner-1", type: "BANK", archivedAt: null });
    await expect(resolveCompanyPaymentAccount(tx, "owner-1", "bank-1")).resolves.toEqual({
      accountId: "bank-1",
      paymentMethod: "BANK_TRANSFER",
    });
  });

  it("blocks another business's account (403) and an archived one (409)", async () => {
    const tx = makeTx();
    tx.cashAccount.findUnique.mockResolvedValueOnce({ userId: "someone-else", type: "BANK", archivedAt: null });
    await expect(resolveCompanyPaymentAccount(tx, "owner-1", "bank-x")).rejects.toMatchObject({ status: 403 });
    tx.cashAccount.findUnique.mockResolvedValueOnce({ userId: "owner-1", type: "BANK", archivedAt: new Date() });
    await expect(resolveCompanyPaymentAccount(tx, "owner-1", "bank-old")).rejects.toMatchObject({ status: 409 });
  });
});

describe("company auto-post", () => {
  const base = {
    userId: "owner-1",
    paymentId: "pay-1",
    accountId: "bank-1",
    amount: 5000,
    date: new Date("2026-11-27T00:00:00.000Z"),
    partyName: "Ram Traders",
    recordedById: "owner-1",
  };

  it("dealer payment is money IN, sale receipt", async () => {
    const tx = makeTx();
    tx.cashAccount.findUnique.mockResolvedValue({ userId: "owner-1", archivedAt: null });
    tx.cashMovement.findFirst.mockResolvedValue(null);
    await postCompanyDealerPaymentMovement({ tx, ...base });
    expect(tx.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: "IN",
        category: "SALE_RECEIPT",
        sourceType: "COMPANY_DEALER_PAYMENT",
        sourceId: "pay-1",
        accountId: "bank-1",
        bsDate: "2083-08-11",
        partyName: "Ram Traders",
        amount: new Prisma.Decimal(5000),
      }),
    });
  });

  it("supplier payment is money OUT, payment to supplier", async () => {
    const tx = makeTx();
    tx.cashAccount.findUnique.mockResolvedValue({ userId: "owner-1", archivedAt: null });
    tx.cashMovement.findFirst.mockResolvedValue(null);
    await postCompanySupplierPaymentMovement({ tx, ...base });
    expect(tx.cashMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: "OUT",
        category: "PAYMENT_TO_DEALER",
        sourceType: "COMPANY_SUPPLIER_PAYMENT",
      }),
    });
  });

  it("removes supplier payment entries only for that owner, and skips an empty list", async () => {
    const tx = makeTx();
    await deleteCompanySupplierPaymentMovements(tx, "owner-1", []);
    expect(tx.cashMovement.deleteMany).not.toHaveBeenCalled();
    await deleteCompanySupplierPaymentMovements(tx, "owner-1", ["p1", "p2"]);
    expect(tx.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: { userId: "owner-1", sourceType: "COMPANY_SUPPLIER_PAYMENT", sourceId: { in: ["p1", "p2"] } },
    });
  });
});

describe("assertCompanyDealer", () => {
  it("allows a dealer the company created", async () => {
    const tx = makeTx();
    tx.dealer.findUnique.mockResolvedValue({ name: "Ram Traders", userId: "owner-1" });
    await expect(assertCompanyDealer(tx, "co-1", "owner-1", "d-1")).resolves.toEqual({ name: "Ram Traders" });
  });

  it("allows a dealer already linked by an account", async () => {
    const tx = makeTx();
    tx.dealer.findUnique.mockResolvedValue({ name: "Linked", userId: "other" });
    tx.companyDealerAccount.findUnique.mockResolvedValue({ id: "acc-1" });
    await expect(assertCompanyDealer(tx, "co-1", "owner-1", "d-2")).resolves.toEqual({ name: "Linked" });
  });

  it("blocks another company's dealer (404)", async () => {
    const tx = makeTx();
    tx.dealer.findUnique.mockResolvedValue({ name: "Not mine", userId: "other" });
    tx.companyDealerAccount.findUnique.mockResolvedValue(null);
    const err = await assertCompanyDealer(tx, "co-1", "owner-1", "d-3").catch((e) => e);
    expect(err).toBeInstanceOf(CashflowError);
    expect(err.status).toBe(404);
  });
});

describe("CompanyDealerAccountService.deletePayment", () => {
  const db = prisma as any;

  function setup(payment: any) {
    const tx = makeTx();
    tx.dealer.findUnique.mockResolvedValue({ name: "Ram Traders", userId: "owner-1" });
    tx.companyDealerPayment.findUnique.mockResolvedValue(payment);
    tx.companyDealerPayment.findFirst.mockResolvedValue({ paymentDate: new Date("2026-11-20T00:00:00.000Z") });
    tx.companyDealerAccount.update.mockResolvedValue({ id: "acc-1", balance: 0 });
    db.$transaction.mockImplementation(async (fn: any) => fn(tx));
    return tx;
  }

  const input = { companyId: "co-1", ownerUserId: "owner-1", dealerId: "d-1", paymentId: "pay-1" };

  it("undoes the payment everywhere", async () => {
    const createdAt = new Date("2026-11-25T08:00:00.000Z");
    const amount = new Prisma.Decimal(3000);
    const tx = setup({ id: "pay-1", amount, createdAt, account: { id: "acc-1", companyId: "co-1", dealerId: "d-1" } });

    await CompanyDealerAccountService.deletePayment(input);

    expect(tx.companyDealerPayment.delete).toHaveBeenCalledWith({ where: { id: "pay-1" } });
    // Later "Balance" lines get the amount back.
    expect(tx.companyDealerPayment.updateMany).toHaveBeenCalledWith({
      where: { accountId: "acc-1", createdAt: { gt: createdAt } },
      data: { balanceAfter: { increment: amount } },
    });
    expect(tx.companyDealerAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: {
        balance: { increment: amount },
        totalPayments: { decrement: amount },
        lastPaymentDate: new Date("2026-11-20T00:00:00.000Z"),
      },
    });
    expect(tx.cashMovement.deleteMany).toHaveBeenCalledWith({
      where: { userId: "owner-1", sourceType: "COMPANY_DEALER_PAYMENT", sourceId: "pay-1" },
    });
  });

  it("404 when the payment is another dealer's or already gone, and changes nothing", async () => {
    const tx = setup({
      id: "pay-1",
      amount: new Prisma.Decimal(1),
      createdAt: new Date(),
      account: { id: "acc-9", companyId: "co-1", dealerId: "d-other" },
    });
    await expect(CompanyDealerAccountService.deletePayment(input)).rejects.toMatchObject({ status: 404 });
    tx.companyDealerPayment.findUnique.mockResolvedValue(null);
    await expect(CompanyDealerAccountService.deletePayment(input)).rejects.toMatchObject({ status: 404 });
    expect(tx.companyDealerPayment.delete).not.toHaveBeenCalled();
    expect(tx.companyDealerAccount.update).not.toHaveBeenCalled();
    expect(tx.cashMovement.deleteMany).not.toHaveBeenCalled();
  });
});
