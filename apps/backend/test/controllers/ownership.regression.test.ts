/**
 * Regression tests for the ownership-check hardening pass.
 *
 * Each test proves that a request from a non-owner gets a 404 (not a 403, not
 * the record itself, not a 500). The handler should drive the ownership check
 * through the WHERE clause so a non-matching row returns null and we respond
 * with "not found" — the same code path as a genuinely missing id, which also
 * prevents attackers from enumerating ids by status code.
 */

jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    batch: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    farm: { findFirst: jest.fn() },
    expense: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    mortality: { create: jest.fn() },
  };
  client.$transaction = jest.fn((fn: (tx: any) => unknown) => fn(client));
  return { __esModule: true, default: client };
});

jest.mock("../../src/services/farmerFcrService", () => ({
  refreshFarmerFcrHistorySafely: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { getAllBatches, updateBatchStatus } from "../../src/controller/batchController";
import { getAllExpenses, getBatchExpenses } from "../../src/controller/expenseController";
import { createMortality } from "../../src/controller/mortalityController";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

const stranger = { userId: "stranger", role: "OWNER" };

beforeEach(() => jest.clearAllMocks());

describe("updateBatchStatus (batchController)", () => {
  it("returns 404 when the batch is not on a farm owned by this user", async () => {
    db.batch.findFirst.mockResolvedValue(null);
    const res = makeResponse();

    await updateBatchStatus(
      { params: { id: "someone-elses-batch" }, body: { status: "ACTIVE" }, ...stranger } as any,
      res,
    );

    expect(db.batch.findFirst.mock.calls[0][0].where).toEqual({
      id: "someone-elses-batch",
      farm: { ownerId: "stranger" },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(db.batch.update).not.toHaveBeenCalled();
  });
});

describe("createMortality (mortalityController)", () => {
  it("returns 404 when the batch is not on a farm owned by this user", async () => {
    db.batch.findFirst.mockResolvedValue(null);
    const res = makeResponse();

    await createMortality(
      {
        body: { date: new Date().toISOString(), count: 1, batchId: "someone-elses-batch" },
        ...stranger,
      } as any,
      res,
    );

    expect(db.batch.findFirst.mock.calls[0][0].where).toEqual({
      id: "someone-elses-batch",
      farm: { ownerId: "stranger" },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(db.mortality.create).not.toHaveBeenCalled();
  });
});

describe("getBatchExpenses (expenseController)", () => {
  it("returns 404 when the batch is not on a farm owned by this user", async () => {
    db.batch.findFirst.mockResolvedValue(null);
    const res = makeResponse();

    await getBatchExpenses(
      { params: { batchId: "someone-elses-batch" }, query: {}, ...stranger } as any,
      res,
    );

    expect(db.batch.findFirst.mock.calls[0][0].where).toEqual({
      id: "someone-elses-batch",
      farm: { ownerId: "stranger" },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(db.expense.findMany).not.toHaveBeenCalled();
  });
});

describe("getAllBatches (?farmId= pre-check)", () => {
  it("returns 404 when filter farmId is not owned by this user", async () => {
    db.farm.findFirst.mockResolvedValue(null); // userOwnsFarm -> false
    const res = makeResponse();

    await getAllBatches(
      { query: { farmId: "someone-elses-farm" }, ...stranger } as any,
      res,
    );

    expect(db.farm.findFirst).toHaveBeenCalledWith({
      where: { id: "someone-elses-farm", ownerId: "stranger" },
      select: { id: true },
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("getAllExpenses (?farmId= / ?batchId= pre-check)", () => {
  it("returns 404 when filter farmId is not owned by this user", async () => {
    db.farm.findFirst.mockResolvedValue(null);
    const res = makeResponse();

    await getAllExpenses(
      { query: { farmId: "someone-elses-farm" }, ...stranger } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(db.expense.findMany).not.toHaveBeenCalled();
  });

  it("returns 404 when filter batchId is not owned by this user", async () => {
    db.batch.findFirst.mockResolvedValue(null);
    const res = makeResponse();

    await getAllExpenses(
      { query: { batchId: "someone-elses-batch" }, ...stranger } as any,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(db.expense.findMany).not.toHaveBeenCalled();
  });
});
