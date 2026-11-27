jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    hatcheryEggSale: { findFirst: jest.fn() },
    hatcheryParentSale: { findFirst: jest.fn() },
    hatcheryChickSale: { findFirst: jest.fn() },
  };
  return { __esModule: true, default: client };
});

import prisma from "../../src/utils/prisma";
import { getHatcherySaleById } from "../../src/controller/hatcherySaleController";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

const request = (
  type: string,
  saleId: string,
  userId: string | undefined = "owner-1"
) =>
  ({
    params: { type, saleId },
    userId,
    role: "HATCHERY",
  }) as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getHatcherySaleById — ownership + shape", () => {
  it("returns an egg_sale owned by the caller with party + batch + eggType", async () => {
    const sale = {
      id: "sale-egg-1",
      invoiceNumber: "HAT-001",
      date: new Date("2026-11-01"),
      count: 100,
      unitPrice: "20",
      amount: "2000",
      party: { id: "p-1", name: "Hari", phone: "9800000000", address: "Baglung", balance: "500" },
      batch: { id: "b-1", code: "B01", name: "Batch 1" },
      eggType: { id: "et-1", name: "Fertile" },
    };
    db.hatcheryEggSale.findFirst.mockResolvedValue(sale);

    const res = makeResponse();
    await getHatcherySaleById(request("egg_sale", "sale-egg-1"), res);

    expect(db.hatcheryEggSale.findFirst.mock.calls[0][0].where).toEqual({
      id: "sale-egg-1",
      hatcheryOwnerId: "owner-1",
    });
    expect(res.json).toHaveBeenCalledWith({ type: "egg_sale", sale });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns a chick_sale owned by the caller with party + incubationBatch", async () => {
    const sale = {
      id: "sale-chick-1",
      grade: "A",
      count: 50,
      amount: "4000",
      party: { id: "p-1", name: "Hari", phone: null, address: null, balance: "0" },
      incubationBatch: { id: "ib-1", code: "IB01", name: "Incub 1" },
    };
    db.hatcheryChickSale.findFirst.mockResolvedValue(sale);

    const res = makeResponse();
    await getHatcherySaleById(request("chick_sale", "sale-chick-1"), res);

    expect(db.hatcheryChickSale.findFirst.mock.calls[0][0].where).toEqual({
      id: "sale-chick-1",
      hatcheryOwnerId: "owner-1",
    });
    expect(res.json).toHaveBeenCalledWith({ type: "chick_sale", sale });
  });

  it("returns a parent_sale with male/female/weight fields passed through", async () => {
    const sale = {
      id: "sale-parent-1",
      maleCount: 5,
      femaleCount: 10,
      totalWeightKg: "25",
      avgWeightKg: "1.67",
      ratePerKg: "500",
      amount: "12500",
      party: { id: "p-2", name: "Shova", phone: null, address: null, balance: "0" },
      batch: { id: "b-1", code: "B01", name: "Batch 1" },
    };
    db.hatcheryParentSale.findFirst.mockResolvedValue(sale);

    const res = makeResponse();
    await getHatcherySaleById(request("parent_sale", "sale-parent-1"), res);

    expect(res.json).toHaveBeenCalledWith({ type: "parent_sale", sale });
  });

  it("returns 404 when the sale belongs to another hatchery owner (no 403 — prevents id enumeration)", async () => {
    db.hatcheryEggSale.findFirst.mockResolvedValue(null);

    const res = makeResponse();
    await getHatcherySaleById(request("egg_sale", "sale-egg-1", "someone-else"), res);

    expect(db.hatcheryEggSale.findFirst.mock.calls[0][0].where).toEqual({
      id: "sale-egg-1",
      hatcheryOwnerId: "someone-else",
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Sale not found" });
  });

  it("returns 400 for an unknown sale type", async () => {
    const res = makeResponse();
    await getHatcherySaleById(request("supplier_payment" as any, "any-id"), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.hatcheryEggSale.findFirst).not.toHaveBeenCalled();
    expect(db.hatcheryParentSale.findFirst).not.toHaveBeenCalled();
    expect(db.hatcheryChickSale.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 for a nonexistent saleId within the owner's scope", async () => {
    db.hatcheryParentSale.findFirst.mockResolvedValue(null);

    const res = makeResponse();
    await getHatcherySaleById(request("parent_sale", "does-not-exist"), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Sale not found" });
  });

  it("returns 200 with party: null for a walk-in cash sale", async () => {
    const sale = {
      id: "sale-egg-cash",
      invoiceNumber: "HAT-002",
      count: 10,
      unitPrice: "20",
      amount: "200",
      party: null,
      batch: { id: "b-1", code: "B01", name: "Batch 1" },
      eggType: { id: "et-1", name: "Fertile" },
    };
    db.hatcheryEggSale.findFirst.mockResolvedValue(sale);

    const res = makeResponse();
    await getHatcherySaleById(request("egg_sale", "sale-egg-cash"), res);

    expect(res.json).toHaveBeenCalledWith({ type: "egg_sale", sale });
  });

  it("returns 401 when the auth middleware is bypassed and userId is missing (defence in depth)", async () => {
    const res = makeResponse();
    const req = {
      params: { type: "egg_sale", saleId: "sale-egg-1" },
      role: "HATCHERY",
    } as any;
    await getHatcherySaleById(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(db.hatcheryEggSale.findFirst).not.toHaveBeenCalled();
  });
});
