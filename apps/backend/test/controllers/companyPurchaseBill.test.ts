jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    company: { findUnique: jest.fn() },
    supplier: { findFirst: jest.fn() },
    rawMaterial: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import prisma from "../../src/utils/prisma";
import { createCompanyPurchase } from "../../src/controller/companyPurchaseController";

const mockedPrisma = prisma as unknown as {
  company: { findUnique: jest.Mock };
  supplier: { findFirst: jest.Mock };
  rawMaterial: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function makeTransactionClient() {
  return {
    companyPurchase: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "purchase-1", ...data }),
      ),
      findUnique: jest.fn().mockResolvedValue({
        id: "purchase-1",
        totalAmount: 200,
        items: [{ id: "item-1" }],
      }),
    },
    companyPurchaseItem: {
      create: jest.fn().mockResolvedValue({ id: "item-1" }),
    },
    rawMaterial: {
      update: jest.fn().mockResolvedValue({ id: "material-1" }),
    },
  };
}

function makeRequest(billImageUrl?: string) {
  return {
    userId: "company-owner-1",
    body: {
      supplierId: "supplier-1",
      items: [
        {
          rawMaterialId: "material-1",
          quantity: 2,
          unitPrice: 100,
        },
      ],
      billImageUrl,
    },
  } as any;
}

describe("Company supplier purchase bill", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.company.findUnique.mockResolvedValue({ id: "company-1" });
    mockedPrisma.supplier.findFirst.mockResolvedValue({
      id: "supplier-1",
      companyId: "company-1",
    });
    mockedPrisma.rawMaterial.findMany.mockResolvedValue([
      { id: "material-1", name: "Maize" },
    ]);
  });

  it("stores a trimmed bill without changing stock or purchase totals", async () => {
    const tx = makeTransactionClient();
    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );
    const response = makeResponse();

    await createCompanyPurchase(
      makeRequest(
        "  https://res.cloudinary.com/demo/image/upload/purchase-bills/bill.jpg  ",
      ),
      response,
    );

    expect(tx.companyPurchase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "company-1",
        supplierId: "supplier-1",
        billImageUrl:
          "https://res.cloudinary.com/demo/image/upload/purchase-bills/bill.jpg",
      }),
    });
    expect(Number(tx.companyPurchase.create.mock.calls[0][0].data.totalAmount)).toBe(200);
    expect(tx.companyPurchaseItem.create).toHaveBeenCalledTimes(1);
    expect(tx.rawMaterial.update).toHaveBeenCalledWith({
      where: { id: "material-1" },
      data: { currentStock: { increment: expect.anything() } },
    });
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("keeps old purchase requests valid when no bill is sent", async () => {
    const tx = makeTransactionClient();
    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await createCompanyPurchase(makeRequest(), makeResponse());

    expect(tx.companyPurchase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ billImageUrl: null }),
    });
  });
});
