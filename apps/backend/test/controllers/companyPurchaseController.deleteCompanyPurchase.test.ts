jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    user: { findUnique: jest.fn() },
    company: { findUnique: jest.fn() },
    companyPurchase: { findFirst: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    rawMaterial: { updateMany: jest.fn(), findUnique: jest.fn() },
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
import { deleteCompanyPurchase } from "../../src/controller/companyPurchaseController";
import { writeBusinessAudit } from "../../src/services/businessAuditService";

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  company: { findUnique: jest.Mock };
  companyPurchase: { findFirst: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
  rawMaterial: { updateMany: jest.Mock; findUnique: jest.Mock };
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
    params: { id: "purchase-1" },
    body: { password: "correct-horse" },
    ...overrides,
  } as any;
}

describe("deleteCompanyPurchase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBcrypt.compare.mockResolvedValue(true);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "owner-1",
      password: "hashed",
    });
    mockedPrisma.company.findUnique.mockResolvedValue({ id: "company-1" });
  });

  it("owner deletes own purchase → 200, raw-material stock decremented, purchase removed", async () => {
    mockedPrisma.companyPurchase.findFirst.mockResolvedValue({
      id: "purchase-1",
      totalAmount: 500,
    });
    mockedPrisma.companyPurchase.findUnique.mockResolvedValue({
      id: "purchase-1",
      companyId: "company-1",
      items: [
        {
          rawMaterialId: "material-1",
          quantity: 50,
          rawMaterial: { name: "Maize" },
        },
      ],
    });
    mockedPrisma.rawMaterial.updateMany.mockResolvedValue({ count: 1 });

    const res = makeResponse();
    await deleteCompanyPurchase(makeRequest(), res);

    expect(mockedPrisma.rawMaterial.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "material-1",
          companyId: "company-1",
          currentStock: expect.objectContaining({ gte: expect.anything() }),
        }),
        data: { currentStock: { decrement: expect.anything() } },
      }),
    );
    expect(mockedPrisma.companyPurchase.delete).toHaveBeenCalledWith({
      where: { id: "purchase-1" },
    });
    expect(mockedWriteAudit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("stock already consumed → 400 with partially-consumed message, no delete", async () => {
    mockedPrisma.companyPurchase.findFirst.mockResolvedValue({
      id: "purchase-1",
      totalAmount: 500,
    });
    mockedPrisma.companyPurchase.findUnique.mockResolvedValue({
      id: "purchase-1",
      companyId: "company-1",
      items: [
        {
          rawMaterialId: "material-1",
          quantity: 50,
          rawMaterial: { name: "Maize" },
        },
      ],
    });
    // Guard failed — zero rows matched the gte clause.
    mockedPrisma.rawMaterial.updateMany.mockResolvedValue({ count: 0 });
    mockedPrisma.rawMaterial.findUnique.mockResolvedValue({ currentStock: 20 });

    const res = makeResponse();
    await deleteCompanyPurchase(makeRequest(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("has been partially consumed"),
      }),
    );
    expect(mockedPrisma.companyPurchase.delete).not.toHaveBeenCalled();
    expect(mockedWriteAudit).not.toHaveBeenCalled();
  });

  it("different company's purchase → 404 (anti-enumeration)", async () => {
    mockedPrisma.companyPurchase.findFirst.mockResolvedValue(null);

    const res = makeResponse();
    await deleteCompanyPurchase(makeRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedPrisma.companyPurchase.delete).not.toHaveBeenCalled();
  });

  it("missing password → 400", async () => {
    const res = makeResponse();
    await deleteCompanyPurchase(makeRequest({ body: {} }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Password confirmation"),
      }),
    );
    expect(mockedBcrypt.compare).not.toHaveBeenCalled();
  });

  it("wrong password → 401", async () => {
    mockedBcrypt.compare.mockResolvedValue(false);

    const res = makeResponse();
    await deleteCompanyPurchase(makeRequest(), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockedPrisma.company.findUnique).not.toHaveBeenCalled();
  });

  it("nonexistent purchaseId → 404", async () => {
    mockedPrisma.companyPurchase.findFirst.mockResolvedValue(null);

    const res = makeResponse();
    await deleteCompanyPurchase(makeRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
