jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    dealer: { findUnique: jest.fn() },
    dealerManualCompany: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../src/services/businessAuditService", () => ({
  writeBusinessAudit: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { recordManualPurchase } from "../../src/controller/dealerManualCompanyController";

const mockedPrisma = prisma as unknown as {
  dealer: { findUnique: jest.Mock };
  dealerManualCompany: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function makeTransactionClient() {
  return {
    dealerProduct: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "product-1" }),
      update: jest.fn(),
    },
    dealerProductTransaction: {
      create: jest.fn().mockResolvedValue({ id: "stock-txn-1" }),
    },
    dealerManualPurchase: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: "purchase-1",
          totalAmount: data.totalAmount,
          billImageUrl: data.billImageUrl,
          items: data.items.create,
        }),
      ),
    },
    dealerManualCompany: {
      update: jest.fn().mockResolvedValue({ id: "company-1" }),
    },
  };
}

function makeRequest(billImageUrl?: string) {
  return {
    userId: "dealer-owner-1",
    params: { id: "company-1" },
    body: {
      items: [
        {
          productName: "Starter Feed",
          type: "FEED",
          unit: "bags",
          quantity: 2,
          costPrice: 100,
          sellingPrice: 120,
        },
      ],
      tradeDiscountAmount: 0,
      billImageUrl,
    },
  } as any;
}

describe("Dealer Manual Company purchase bill", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.dealer.findUnique.mockResolvedValue({ id: "dealer-1" });
    mockedPrisma.dealerManualCompany.findUnique.mockResolvedValue({
      id: "company-1",
      dealerId: "dealer-1",
      name: "Feed Supplier",
    });
  });

  it("stores a trimmed bill without changing stock or purchase totals", async () => {
    const tx = makeTransactionClient();
    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );
    const response = makeResponse();

    await recordManualPurchase(
      makeRequest(
        "  https://res.cloudinary.com/demo/image/upload/purchase-bills/bill.jpg  ",
      ),
      response,
    );

    expect(tx.dealerManualPurchase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        totalAmount: expect.objectContaining({}),
        billImageUrl:
          "https://res.cloudinary.com/demo/image/upload/purchase-bills/bill.jpg",
      }),
      include: { items: true },
    });
    expect(Number(tx.dealerManualPurchase.create.mock.calls[0][0].data.totalAmount)).toBe(200);
    expect(tx.dealerProductTransaction.create).toHaveBeenCalledTimes(1);
    expect(tx.dealerManualCompany.update).toHaveBeenCalledWith({
      where: { id: "company-1" },
      data: {
        balance: { increment: expect.anything() },
        totalPurchases: { increment: expect.anything() },
      },
    });
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("keeps old purchase requests valid when no bill is sent", async () => {
    const tx = makeTransactionClient();
    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    await recordManualPurchase(makeRequest(), makeResponse());

    expect(tx.dealerManualPurchase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ billImageUrl: null }),
      include: { items: true },
    });
  });
});
