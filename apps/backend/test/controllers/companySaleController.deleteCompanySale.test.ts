jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    user: { findUnique: jest.fn() },
    company: { findUnique: jest.fn() },
    companySale: { findFirst: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    product: { update: jest.fn() },
    companyDealerAccount: { update: jest.fn() },
    companyLedgerEntry: { deleteMany: jest.fn() },
  };
  client.$transaction = jest.fn((fn: (tx: any) => unknown) => fn(client));
  return { __esModule: true, default: client };
});

jest.mock("bcrypt", () => ({
  __esModule: true,
  default: { compare: jest.fn() },
}));

jest.mock("../../src/services/businessAuditService", () => ({
  writeBusinessAudit: jest.fn().mockResolvedValue(undefined),
}));

import prisma from "../../src/utils/prisma";
import bcrypt from "bcrypt";
import { deleteCompanySale } from "../../src/controller/companySaleController";
import { writeBusinessAudit } from "../../src/services/businessAuditService";

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  company: { findUnique: jest.Mock };
  companySale: { findFirst: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
  product: { update: jest.Mock };
  companyDealerAccount: { update: jest.Mock };
  companyLedgerEntry: { deleteMany: jest.Mock };
};
const mockedBcrypt = bcrypt as unknown as { compare: jest.Mock };
const mockedWriteAudit = writeBusinessAudit as jest.Mock;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function makeRequest(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    userId: "owner-1",
    params: { id: "sale-1" },
    body: { password: "correct-horse" },
    ...overrides,
  } as any;
}

describe("deleteCompanySale", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBcrypt.compare.mockResolvedValue(true);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "owner-1",
      password: "hashed",
    });
    mockedPrisma.company.findUnique.mockResolvedValue({ id: "company-1" });
  });

  it("owner deletes own sale → 200, product stock restored, dealer balance decremented, ledger cleaned, sale removed", async () => {
    mockedPrisma.companySale.findFirst.mockResolvedValue({
      id: "sale-1",
      totalAmount: 1000,
      invoiceNumber: "CINV-01",
    });
    mockedPrisma.companySale.findUnique.mockResolvedValue({
      id: "sale-1",
      companyId: "company-1",
      totalAmount: 1000,
      accountId: "account-1",
      items: [
        { productId: "product-1", quantity: 10 },
        { productId: "product-2", quantity: 5 },
      ],
    });

    const res = makeResponse();
    await deleteCompanySale(makeRequest(), res);

    expect(mockedPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "product-1" },
        data: { currentStock: { increment: expect.anything() } },
      }),
    );
    expect(mockedPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "product-2" },
        data: { currentStock: { increment: expect.anything() } },
      }),
    );
    expect(mockedPrisma.companyDealerAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "account-1" },
        data: {
          balance: { decrement: expect.anything() },
          totalSales: { decrement: expect.anything() },
        },
      }),
    );
    expect(mockedPrisma.companyLedgerEntry.deleteMany).toHaveBeenCalledWith({
      where: { companySaleId: "sale-1" },
    });
    expect(mockedPrisma.companySale.delete).toHaveBeenCalledWith({
      where: { id: "sale-1" },
    });
    expect(mockedWriteAudit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("sale with accountId=null → balance update skipped", async () => {
    mockedPrisma.companySale.findFirst.mockResolvedValue({
      id: "sale-1",
      totalAmount: 500,
      invoiceNumber: "CINV-02",
    });
    mockedPrisma.companySale.findUnique.mockResolvedValue({
      id: "sale-1",
      companyId: "company-1",
      totalAmount: 500,
      accountId: null,
      items: [{ productId: "product-1", quantity: 2 }],
    });

    const res = makeResponse();
    await deleteCompanySale(makeRequest(), res);

    expect(mockedPrisma.companyDealerAccount.update).not.toHaveBeenCalled();
    expect(mockedPrisma.companySale.delete).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("different company's sale → 404 (anti-enumeration)", async () => {
    mockedPrisma.companySale.findFirst.mockResolvedValue(null);

    const res = makeResponse();
    await deleteCompanySale(makeRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedPrisma.companySale.delete).not.toHaveBeenCalled();
  });

  it("missing password → 400", async () => {
    const res = makeResponse();
    await deleteCompanySale(makeRequest({ body: {} }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedBcrypt.compare).not.toHaveBeenCalled();
  });

  it("wrong password → 401", async () => {
    mockedBcrypt.compare.mockResolvedValue(false);

    const res = makeResponse();
    await deleteCompanySale(makeRequest(), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockedPrisma.company.findUnique).not.toHaveBeenCalled();
  });

  it("nonexistent saleId → 404", async () => {
    mockedPrisma.companySale.findFirst.mockResolvedValue(null);

    const res = makeResponse();
    await deleteCompanySale(makeRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
