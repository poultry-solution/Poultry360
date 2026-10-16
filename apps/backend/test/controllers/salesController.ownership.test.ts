jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    sale: { findFirst: jest.fn(), delete: jest.fn() },
    salePayment: { create: jest.fn() },
  };
  client.$transaction = jest.fn((fn: (tx: any) => unknown) => fn(client));
  return { __esModule: true, default: client };
});

jest.mock("../../src/services/farmerFcrService", () => ({
  refreshFarmerFcrHistorySafely: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { addSalePayment, deleteSale, getSaleById } from "../../src/controller/salesController";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

const request = (body: Record<string, unknown> = {}) =>
  ({ params: { id: "sale-9" }, body, userId: "someone-else", role: "DEALER" }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  // Not this user's sale: the owner filter finds nothing.
  db.sale.findFirst.mockResolvedValue(null);
});

describe("A farmer sale can only be reached by its owner", () => {
  it.each([
    ["open", getSaleById, {}],
    ["delete", deleteSale, {}],
    ["add a payment to", addSalePayment, { amount: 100 }],
  ])("another account cannot %s it", async (_label, handler, body) => {
    const res = makeResponse();
    await (handler as any)(request(body), res);

    expect(db.sale.findFirst.mock.calls[0][0].where).toEqual({
      id: "sale-9",
      category: { userId: "someone-else" },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(db.sale.delete).not.toHaveBeenCalled();
    expect(db.salePayment.create).not.toHaveBeenCalled();
  });
});
