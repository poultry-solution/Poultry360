import dotenv from "dotenv";
import request from "supertest";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  HatcheryBatchStatus,
  HatcheryBatchType,
  HatcheryChickGrade,
  HatcheryIncubationStage,
} from "@prisma/client";

/**
 * Full API regression checks for the hatchery release fixes.
 *
 * This file asks Prisma for a small multi-connection test pool. The normal
 * suite uses one connection to keep local PostgreSQL light, but one connection
 * would serialize the requests and hide the stock races checked here.
 */
describe("Hatchery release API regressions", () => {
  const password = "Hatch-release-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const date = "2026-10-15";

  let app: Express;
  let prisma: PrismaClient;
  let previousTestConnectionLimit: string | undefined;

  let ownerId: string;
  let otherOwnerId: string;
  let ownerToken: string;
  let otherOwnerToken: string;

  let hatchableEggTypeId: string;
  let otherEggTypeId: string;
  let saleBatchId: string;
  let incubationRaceBatchId: string;
  let closedBatchId: string;
  let chickSaleIncubationId: string;
  let hatchCorrectionIncubationId: string;
  let closedBatchIncubationId: string;
  let otherPartyId: string;

  let eggSale: any;
  let parentSale: any;
  let chickSale: any;

  function post(token: string, path: string, body?: string | object) {
    return request(app)
      .post(`/api/v1${path}`)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  function put(token: string, path: string, body?: string | object) {
    return request(app)
      .put(`/api/v1${path}`)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  function get(token: string, path: string) {
    return request(app)
      .get(`/api/v1${path}`)
      .set("Authorization", `Bearer ${token}`);
  }

  function del(token: string, path: string) {
    return request(app)
      .delete(`/api/v1${path}`)
      .set("Authorization", `Bearer ${token}`);
  }

  async function registerHatchery(label: string, phonePrefix: string) {
    const phone = `+977${phonePrefix}${suffix.slice(-8)}`;
    const registration = await request(app)
      .post("/api/v1/auth/register-entity")
      .send({
        name: `${label} ${suffix}`,
        phone,
        password,
        entityType: "HATCHERY",
        entityName: `${label} Business ${suffix}`,
        entityContact: `${phonePrefix}${suffix.slice(-8)}`,
        entityAddress: "Test city",
      });

    expect(registration.status).toBe(201);
    const token = registration.body.accessToken as string;
    const approval = await post(token, "/test/approve-current-user");
    expect(approval.status).toBe(200);

    return {
      id: registration.body.user.id as string,
      token,
    };
  }

  beforeAll(async () => {
    dotenv.config({ path: ".env.test" });
    dotenv.config({ path: ".env" });
    previousTestConnectionLimit = process.env.PRISMA_TEST_CONNECTION_LIMIT;
    process.env.PRISMA_TEST_CONNECTION_LIMIT = "5";

    // Import the app only after the test pool size has been set.
    app = (await import("../../src/index")).default as unknown as Express;
    prisma = (await import("../../src/utils/prisma")).default;

    const [owner, otherOwner] = await Promise.all([
      registerHatchery("Release Test Hatchery", "96"),
      registerHatchery("Other Test Hatchery", "95"),
    ]);
    ownerId = owner.id;
    ownerToken = owner.token;
    otherOwnerId = otherOwner.id;
    otherOwnerToken = otherOwner.token;

    const [hatchableEggType, otherEggType] = await Promise.all([
      prisma.hatcheryEggType.create({
        data: {
          hatcheryOwnerId: ownerId,
          name: `Hatchable ${suffix}`,
          isHatchable: true,
        },
      }),
      prisma.hatcheryEggType.create({
        data: {
          hatcheryOwnerId: otherOwnerId,
          name: `Other egg ${suffix}`,
          isHatchable: false,
        },
      }),
    ]);
    hatchableEggTypeId = hatchableEggType.id;
    otherEggTypeId = otherEggType.id;

    const [saleBatch, incubationRaceBatch, closedBatch] = await Promise.all([
      prisma.hatcheryBatch.create({
        data: {
          hatcheryOwnerId: ownerId,
          type: HatcheryBatchType.PARENT_FLOCK,
          status: HatcheryBatchStatus.ACTIVE,
          code: `PF-SALE-${suffix}`,
          startDate: new Date(date),
          initialParents: 20,
          initialMaleParents: 10,
          initialFemaleParents: 10,
          currentParents: 20,
          currentMaleParents: 10,
          currentFemaleParents: 10,
        },
      }),
      prisma.hatcheryBatch.create({
        data: {
          hatcheryOwnerId: ownerId,
          type: HatcheryBatchType.PARENT_FLOCK,
          status: HatcheryBatchStatus.ACTIVE,
          code: `PF-RACE-${suffix}`,
          startDate: new Date(date),
          initialParents: 10,
          initialMaleParents: 5,
          initialFemaleParents: 5,
          currentParents: 10,
          currentMaleParents: 5,
          currentFemaleParents: 5,
        },
      }),
      prisma.hatcheryBatch.create({
        data: {
          hatcheryOwnerId: ownerId,
          type: HatcheryBatchType.PARENT_FLOCK,
          status: HatcheryBatchStatus.CLOSED,
          code: `PF-CLOSED-${suffix}`,
          startDate: new Date(date),
          endDate: new Date("2026-10-30"),
          initialParents: 10,
          initialMaleParents: 5,
          initialFemaleParents: 5,
          currentParents: 0,
          currentMaleParents: 0,
          currentFemaleParents: 0,
        },
      }),
    ]);
    saleBatchId = saleBatch.id;
    incubationRaceBatchId = incubationRaceBatch.id;
    closedBatchId = closedBatch.id;

    await prisma.hatcheryEggStock.createMany({
      data: [
        {
          batchId: saleBatchId,
          eggTypeId: hatchableEggTypeId,
          currentStock: 10,
        },
        {
          batchId: incubationRaceBatchId,
          eggTypeId: hatchableEggTypeId,
          currentStock: 10,
        },
      ],
    });

    const [chickSaleIncubation, hatchCorrectionIncubation, closedIncubation] =
      await Promise.all([
        prisma.hatcheryIncubationBatch.create({
          data: {
            hatcheryOwnerId: ownerId,
            parentBatchId: saleBatchId,
            hatchableEggTypeId,
            stage: HatcheryIncubationStage.COMPLETED,
            code: "IN-901",
            startDate: new Date(date),
            eggsSetCount: 10,
            setterAt: new Date(date),
            transferredAt: new Date("2026-10-20"),
            hatchedAt: new Date("2026-10-23"),
          },
        }),
        prisma.hatcheryIncubationBatch.create({
          data: {
            hatcheryOwnerId: ownerId,
            parentBatchId: saleBatchId,
            hatchableEggTypeId,
            stage: HatcheryIncubationStage.HATCHER,
            code: "IN-902",
            startDate: new Date(date),
            eggsSetCount: 10,
            setterAt: new Date(date),
            transferredAt: new Date("2026-10-20"),
          },
        }),
        prisma.hatcheryIncubationBatch.create({
          data: {
            hatcheryOwnerId: ownerId,
            parentBatchId: closedBatchId,
            hatchableEggTypeId,
            stage: HatcheryIncubationStage.COMPLETED,
            code: "IN-903",
            startDate: new Date(date),
            eggsSetCount: 4,
            setterAt: new Date(date),
            transferredAt: new Date("2026-10-20"),
            hatchedAt: new Date("2026-10-23"),
          },
        }),
      ]);
    chickSaleIncubationId = chickSaleIncubation.id;
    hatchCorrectionIncubationId = hatchCorrectionIncubation.id;
    closedBatchIncubationId = closedIncubation.id;

    await prisma.hatcheryChickStock.createMany({
      data: [
        {
          incubationBatchId: chickSaleIncubationId,
          grade: HatcheryChickGrade.A,
          currentStock: 10,
        },
        {
          incubationBatchId: closedBatchIncubationId,
          grade: HatcheryChickGrade.A,
          currentStock: 4,
        },
      ],
    });

    const otherParty = await prisma.hatcheryParty.create({
      data: {
        hatcheryOwnerId: otherOwnerId,
        name: `Other party ${suffix}`,
        phone: `94${suffix.slice(-8)}`,
      },
    });
    otherPartyId = otherParty.id;
  });

  afterAll(async () => {
    if (!prisma) return;

    // Audit writes run after the HTTP response has finished.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const ownerIds = [ownerId, otherOwnerId].filter(Boolean);
    if (ownerIds.length > 0) {
      await prisma.businessAuditLog.deleteMany({
        where: {
          OR: [
            { accountOwnerId: { in: ownerIds } },
            { actorId: { in: ownerIds } },
          ],
        },
      });
      await prisma.hatcheryIncubationBatch.deleteMany({
        where: { hatcheryOwnerId: { in: ownerIds } },
      });
      await prisma.hatcheryBatch.deleteMany({
        where: { hatcheryOwnerId: { in: ownerIds } },
      });
      await prisma.hatcheryEggType.deleteMany({
        where: { hatcheryOwnerId: { in: ownerIds } },
      });
      await prisma.hatcheryParty.deleteMany({
        where: { hatcheryOwnerId: { in: ownerIds } },
      });
      await prisma.hatcheryBusiness.deleteMany({
        where: { ownerId: { in: ownerIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
      await prisma.businessAuditLog.deleteMany({
        where: {
          OR: [
            { accountOwnerId: { in: ownerIds } },
            { actorId: { in: ownerIds } },
          ],
        },
      });
    }

    await prisma.$disconnect();
    if (previousTestConnectionLimit === undefined) {
      delete process.env.PRISMA_TEST_CONNECTION_LIMIT;
    } else {
      process.env.PRISMA_TEST_CONNECTION_LIMIT = previousTestConnectionLimit;
    }
  });

  it("blocks an egg type owned by another hatchery", async () => {
    const response = await post(
      ownerToken,
      `/hatchery/batches/${saleBatchId}/egg-productions`,
      {
        date,
        lines: [{ eggTypeId: otherEggTypeId, count: 2 }],
      }
    );

    expect(response.status).toBe(404);
    expect(String(response.body.error ?? "")).toMatch(/egg type not found/i);
    expect(
      await prisma.hatcheryEggStock.findFirst({
        where: { batchId: saleBatchId, eggTypeId: otherEggTypeId },
      })
    ).toBeNull();
  });

  it("does not oversell eggs when two sales happen together", async () => {
    const body = {
      eggTypeId: hatchableEggTypeId,
      date,
      count: 7,
      unitPrice: 0,
    };
    const responses = await Promise.all([
      post(ownerToken, `/hatchery/batches/${saleBatchId}/egg-sales`, body),
      post(ownerToken, `/hatchery/batches/${saleBatchId}/egg-sales`, body),
    ]);

    expect(responses.map((row) => row.status).sort((a, b) => a - b)).toEqual([
      201, 400,
    ]);
    eggSale = responses.find((row) => row.status === 201)!.body;
    expect(Number(eggSale.unitPrice)).toBe(0);
    expect(Number(eggSale.amount)).toBe(0);

    const stock = await prisma.hatcheryEggStock.findUniqueOrThrow({
      where: {
        batchId_eggTypeId: {
          batchId: saleBatchId,
          eggTypeId: hatchableEggTypeId,
        },
      },
    });
    expect(stock.currentStock).toBe(3);
    expect(
      await prisma.hatcheryEggSale.count({ where: { batchId: saleBatchId } })
    ).toBe(1);
  });

  it("blocks another hatchery's party and accepts a free parent sale", async () => {
    const saleBody = {
      date,
      maleCount: 1,
      femaleCount: 0,
      totalWeightKg: 2,
      ratePerKg: 0,
    };

    const blocked = await post(
      ownerToken,
      `/hatchery/batches/${saleBatchId}/parent-sales`,
      { ...saleBody, partyId: otherPartyId }
    );
    expect(blocked.status).toBe(400);
    expect(String(blocked.body.error ?? "")).toMatch(/party not found/i);

    const created = await post(
      ownerToken,
      `/hatchery/batches/${saleBatchId}/parent-sales`,
      saleBody
    );
    expect(created.status).toBe(201);
    expect(Number(created.body.ratePerKg)).toBe(0);
    expect(Number(created.body.amount)).toBe(0);
    parentSale = created.body;

    const batch = await prisma.hatcheryBatch.findUniqueOrThrow({
      where: { id: saleBatchId },
    });
    expect(batch.currentMaleParents).toBe(9);
    expect(batch.currentParents).toBe(19);
  });

  it("blocks another hatchery and does not oversell chicks", async () => {
    const saleBody = {
      grade: "A",
      date,
      count: 7,
      unitPrice: 0,
    };

    const otherOwnerAttempt = await post(
      otherOwnerToken,
      `/hatchery/incubations/${chickSaleIncubationId}/chick-sales`,
      saleBody
    );
    expect(otherOwnerAttempt.status).toBe(404);

    const responses = await Promise.all([
      post(
        ownerToken,
        `/hatchery/incubations/${chickSaleIncubationId}/chick-sales`,
        saleBody
      ),
      post(
        ownerToken,
        `/hatchery/incubations/${chickSaleIncubationId}/chick-sales`,
        saleBody
      ),
    ]);
    expect(responses.map((row) => row.status).sort((a, b) => a - b)).toEqual([
      201, 400,
    ]);
    chickSale = responses.find((row) => row.status === 201)!.body;
    expect(Number(chickSale.unitPrice)).toBe(0);
    expect(Number(chickSale.amount)).toBe(0);

    const stock = await prisma.hatcheryChickStock.findUniqueOrThrow({
      where: {
        incubationBatchId_grade: {
          incubationBatchId: chickSaleIncubationId,
          grade: HatcheryChickGrade.A,
        },
      },
    });
    expect(stock.currentStock).toBe(3);
  });

  it("uses one invoice sequence and keeps sale bills private", async () => {
    expect([
      eggSale.invoiceNumber,
      parentSale.invoiceNumber,
      chickSale.invoiceNumber,
    ]).toEqual(["HB-0001", "HB-0002", "HB-0003"]);

    const saleCases = [
      { type: "egg_sale", id: eggSale.id },
      { type: "parent_sale", id: parentSale.id },
      { type: "chick_sale", id: chickSale.id },
    ];
    for (const saleCase of saleCases) {
      const own = await get(
        ownerToken,
        `/hatchery/sales/${saleCase.type}/${saleCase.id}`
      );
      expect(own.status).toBe(200);
      expect(own.body).toMatchObject({
        type: saleCase.type,
        sale: { id: saleCase.id },
      });

      const other = await get(
        otherOwnerToken,
        `/hatchery/sales/${saleCase.type}/${saleCase.id}`
      );
      expect(other.status).toBe(404);
    }
  });

  it("can fix a hatch result before sales and blocks the fix after a sale", async () => {
    const resultBody = {
      date: "2026-10-23",
      hatchedA: 6,
      hatchedB: 4,
      cull: 0,
      lateDead: 0,
      unhatched: 0,
    };

    const first = await post(
      ownerToken,
      `/hatchery/incubations/${hatchCorrectionIncubationId}/hatch-results`,
      resultBody
    );
    expect(first.status).toBe(201);

    const removed = await del(
      ownerToken,
      `/hatchery/incubations/${hatchCorrectionIncubationId}/hatch-results/${first.body.id}`
    );
    expect(removed.status).toBe(200);
    expect(
      await prisma.hatcheryHatchResult.count({
        where: { incubationBatchId: hatchCorrectionIncubationId },
      })
    ).toBe(0);
    expect(
      (
        await prisma.hatcheryIncubationBatch.findUniqueOrThrow({
          where: { id: hatchCorrectionIncubationId },
        })
      ).stage
    ).toBe(HatcheryIncubationStage.HATCHER);

    const replacement = await post(
      ownerToken,
      `/hatchery/incubations/${hatchCorrectionIncubationId}/hatch-results`,
      resultBody
    );
    expect(replacement.status).toBe(201);

    const sale = await post(
      ownerToken,
      `/hatchery/incubations/${hatchCorrectionIncubationId}/chick-sales`,
      { grade: "A", date, count: 1, unitPrice: 0 }
    );
    expect(sale.status).toBe(201);

    const blocked = await del(
      ownerToken,
      `/hatchery/incubations/${hatchCorrectionIncubationId}/hatch-results/${replacement.body.id}`
    );
    expect(blocked.status).toBe(400);
    expect(String(blocked.body.error ?? "")).toMatch(/sold|delete sales first/i);
  });

  it("shows remaining chicks after the parent batch is closed", async () => {
    const response = await get(
      ownerToken,
      `/hatchery/produced-chicks/stock?incubationBatchId=${closedBatchIncubationId}`
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          incubationBatchId: closedBatchIncubationId,
          currentStock: 4,
          incubationBatch: expect.objectContaining({
            parentBatch: expect.objectContaining({ status: "CLOSED" }),
          }),
        }),
      ])
    );
    expect(response.body.summary.totalStock).toBe(4);
  });

  it("does not oversell hatchable eggs when two incubations start together", async () => {
    const body = {
      parentBatchId: incubationRaceBatchId,
      startDate: date,
      eggsSetCount: 7,
    };
    const responses = await Promise.all([
      post(ownerToken, "/hatchery/incubations", {
        ...body,
        name: "Race start one",
      }),
      post(ownerToken, "/hatchery/incubations", {
        ...body,
        name: "Race start two",
      }),
    ]);

    expect(responses.map((row) => row.status).sort((a, b) => a - b)).toEqual([
      201, 400,
    ]);
    const stock = await prisma.hatcheryEggStock.findUniqueOrThrow({
      where: {
        batchId_eggTypeId: {
          batchId: incubationRaceBatchId,
          eggTypeId: hatchableEggTypeId,
        },
      },
    });
    expect(stock.currentStock).toBe(3);
    expect(
      await prisma.hatcheryIncubationBatch.count({
        where: { parentBatchId: incubationRaceBatchId },
      })
    ).toBe(1);
    expect(
      await prisma.hatcheryEggMove.count({
        where: { parentBatchId: incubationRaceBatchId },
      })
    ).toBe(1);
  });

  it("trims egg names and returns clear errors for bad values", async () => {
    const first = await post(otherOwnerToken, "/hatchery/egg-types", {
      name: `  Trimmed ${suffix}  `,
      isHatchable: false,
    });
    expect(first.status).toBe(201);
    expect(first.body.name).toBe(`Trimmed ${suffix}`);

    const second = await post(otherOwnerToken, "/hatchery/egg-types", {
      name: `Second ${suffix}`,
      isHatchable: false,
    });
    expect(second.status).toBe(201);

    const blankUpdate = await put(
      otherOwnerToken,
      `/hatchery/egg-types/${first.body.id}`,
      { name: "   " }
    );
    expect(blankUpdate.status).toBe(400);
    expect(String(blankUpdate.body.error ?? "")).toMatch(/name is required/i);

    const duplicateUpdate = await put(
      otherOwnerToken,
      `/hatchery/egg-types/${second.body.id}`,
      { name: `  Trimmed ${suffix}  ` }
    );
    expect(duplicateUpdate.status).toBe(400);
    expect(String(duplicateUpdate.body.error ?? "")).toMatch(/already exists/i);

    const badBoolean = await post(otherOwnerToken, "/hatchery/egg-types", {
      name: `Bad boolean ${suffix}`,
      isHatchable: "false",
    });
    expect(badBoolean.status).toBe(400);
    expect(String(badBoolean.body.error ?? "")).toMatch(/boolean/i);
  });

  it("allows only one hatchable egg type during same-time creates", async () => {
    const responses = await Promise.all([
      post(otherOwnerToken, "/hatchery/egg-types", {
        name: `Hatchable one ${suffix}`,
        isHatchable: true,
      }),
      post(otherOwnerToken, "/hatchery/egg-types", {
        name: `Hatchable two ${suffix}`,
        isHatchable: true,
      }),
    ]);

    expect(responses.map((row) => row.status).sort((a, b) => a - b)).toEqual([
      201, 400,
    ]);
    expect(
      await prisma.hatcheryEggType.count({
        where: { hatcheryOwnerId: otherOwnerId, isHatchable: true },
      })
    ).toBe(1);
  });
});
