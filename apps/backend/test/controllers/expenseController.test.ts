jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    batch: { findUnique: jest.fn() },
    expense: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

import prisma from "../../src/utils/prisma";
import {
  createExpenseCategory,
  getBatchExpenses,
  getExpenseCategories,
} from "../../src/controller/expenseController";

const mocked = prisma as unknown as {
  batch: { findUnique: jest.Mock };
  expense: {
    findMany: jest.Mock;
    count: jest.Mock;
    aggregate: jest.Mock;
  };
  category: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
  };
};

function makeResponse() {
  const response: any = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("saved Other expense names", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("trims a new name and checks duplicates without case sensitivity", async () => {
    mocked.category.findFirst.mockResolvedValue(null);
    mocked.category.create.mockResolvedValue({
      id: "category-transport",
      name: "Transport",
      type: "EXPENSE",
    });
    const response = makeResponse();

    await createExpenseCategory({
      userId: "farmer-1",
      body: { name: "  Transport  ", description: "Saved Other expense name" },
    } as any, response);

    expect(mocked.category.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "farmer-1",
        name: { equals: "Transport", mode: "insensitive" },
        type: "EXPENSE",
      },
    });
    expect(mocked.category.create).toHaveBeenCalledWith({
      data: {
        name: "Transport",
        type: "EXPENSE",
        description: "Saved Other expense name",
        userId: "farmer-1",
      },
    });
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("does not create the same saved name with different letter case", async () => {
    mocked.category.findFirst.mockResolvedValue({ id: "category-transport" });
    const response = makeResponse();

    await createExpenseCategory({
      userId: "farmer-1",
      body: { name: "transport" },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mocked.category.create).not.toHaveBeenCalled();
  });

  it("adds missing default categories for a user who already has categories", async () => {
    mocked.category.findMany
      .mockResolvedValueOnce([
        {
          id: "category-feed",
          name: "Feed",
          type: "EXPENSE",
          description: null,
          _count: { expenses: 1 },
        },
        {
          id: "category-chicks",
          name: "Chicks Purchase",
          type: "EXPENSE",
          description: null,
          _count: { expenses: 1 },
        },
      ])
      .mockResolvedValueOnce([
        { id: "category-feed", name: "Feed", type: "EXPENSE" },
        { id: "category-other", name: "Other", type: "EXPENSE" },
      ]);
    mocked.category.createMany.mockResolvedValue({ count: 4 });
    const response = makeResponse();

    await getExpenseCategories({
      userId: "farmer-1",
      query: { type: "EXPENSE" },
    } as any, response);

    expect(mocked.category.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: "Medicine", userId: "farmer-1" }),
        expect.objectContaining({ name: "Hatchery", userId: "farmer-1" }),
        expect.objectContaining({ name: "Equipment", userId: "farmer-1" }),
        expect.objectContaining({ name: "Other", userId: "farmer-1" }),
      ]),
      skipDuplicates: true,
    });
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({ name: "Other" }),
      ]),
    });
  });

  it("includes custom expense names in the Other filter", async () => {
    mocked.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      farm: { ownerId: "farmer-1", owner: {}, managers: [] },
    });
    mocked.expense.findMany.mockResolvedValue([]);
    mocked.expense.count.mockResolvedValue(0);
    mocked.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
    const response = makeResponse();

    await getBatchExpenses({
      params: { batchId: "batch-1" },
      query: { category: "Other" },
      userId: "farmer-1",
      role: "OWNER",
    } as any, response);

    expect(mocked.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          batchId: "batch-1",
          category: {
            name: { notIn: ["Feed", "Medicine", "Hatchery", "Chicks"] },
          },
        },
      }),
    );
  });
});
