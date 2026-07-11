import {
  Prisma,
  HatcheryBatchType,
  HatcheryIncubationStage,
  HatcheryIncubationLossType,
  HatcheryChickGrade,
  HatcheryChickTxnType,
} from "@prisma/client";
import prisma from "../utils/prisma";

export class HatcheryIncubationService {
  private static assertNonNegativeInteger(value: number, label: string) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${label} must be a non-negative integer`);
    }
  }

  private static async lockIncubationBatch(
    tx: Prisma.TransactionClient,
    incubationBatchId: string,
    hatcheryOwnerId: string
  ) {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "HatcheryIncubationBatch"
      WHERE id = ${incubationBatchId}
        AND "hatcheryOwnerId" = ${hatcheryOwnerId}
      FOR UPDATE
    `;

    if (lockedRows.length === 0) throw new Error("Incubation batch not found");

    const incubation = await tx.hatcheryIncubationBatch.findFirst({
      where: { id: incubationBatchId, hatcheryOwnerId },
    });
    if (!incubation) throw new Error("Incubation batch not found");

    return incubation;
  }

  /**
   * Auto-generate incubation batch code scoped to hatchery owner.
   */
  static async generateCode(hatcheryOwnerId: string): Promise<string> {
    const count = await prisma.hatcheryIncubationBatch.count({
      where: { hatcheryOwnerId },
    });
    return `IN-${String(count + 1).padStart(3, "0")}`;
  }

  /**
   * Create an incubation batch that consumes HATCHABLE eggs from a parent flock batch.
   * Atomic: batch create + egg move + parent stock decrement in one transaction.
   */
  static async createIncubationBatch(data: {
    hatcheryOwnerId: string;
    parentBatchId: string;
    startDate: Date;
    eggsSetCount: number;
    notes?: string;
    name?: string;
  }) {
    const { hatcheryOwnerId, parentBatchId, startDate, eggsSetCount, notes, name } = data;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate parent batch
      const parentBatch = await tx.hatcheryBatch.findFirst({
        where: { id: parentBatchId, hatcheryOwnerId },
      });
      if (!parentBatch) {
        throw new Error("Parent flock batch not found");
      }
      if (parentBatch.type !== HatcheryBatchType.PARENT_FLOCK) {
        throw new Error("Source batch must be of type PARENT_FLOCK");
      }

      // Find the hatchable egg type for this owner
      const hatchableType = await tx.hatcheryEggType.findFirst({
        where: { hatcheryOwnerId, isHatchable: true },
      });
      if (!hatchableType) {
        throw new Error(
          "No HATCHABLE egg type configured. Create one under Egg Types first."
        );
      }

      // Validate egg stock
      const eggStock = await tx.hatcheryEggStock.findUnique({
        where: {
          batchId_eggTypeId: { batchId: parentBatchId, eggTypeId: hatchableType.id },
        },
      });
      const available = eggStock?.currentStock ?? 0;
      if (available < eggsSetCount) {
        throw new Error(
          `Insufficient HATCHABLE egg stock: have ${available}, need ${eggsSetCount}`
        );
      }

      // Generate code
      const code = await HatcheryIncubationService.generateCode(hatcheryOwnerId);

      // Create incubation batch
      const incubation = await tx.hatcheryIncubationBatch.create({
        data: {
          hatcheryOwnerId,
          parentBatchId,
          hatchableEggTypeId: hatchableType.id,
          stage: HatcheryIncubationStage.SETTER,
          code,
          name,
          startDate,
          eggsSetCount,
          setterAt: startDate,
          notes,
        },
      });

      // Audit egg move
      await tx.hatcheryEggMove.create({
        data: {
          incubationBatchId: incubation.id,
          parentBatchId,
          eggTypeId: hatchableType.id,
          count: eggsSetCount,
          date: startDate,
        },
      });

      // Decrement parent egg stock
      await tx.hatcheryEggStock.update({
        where: {
          batchId_eggTypeId: { batchId: parentBatchId, eggTypeId: hatchableType.id },
        },
        data: { currentStock: { decrement: eggsSetCount } },
      });

      return incubation;
    });
  }

  /**
   * Record candling losses (INFERTILE and/or EARLY_DEAD).
   * Advances stage to CANDLING.
   */
  static async recordCandling(
    tx: Prisma.TransactionClient,
    data: {
      incubationBatchId: string;
      hatcheryOwnerId: string;
      date: Date;
      infertile: number;
      earlyDead: number;
      note?: string;
    }
  ) {
    const { incubationBatchId, hatcheryOwnerId, date, infertile, earlyDead, note } = data;

    HatcheryIncubationService.assertNonNegativeInteger(infertile, "Infertile count");
    HatcheryIncubationService.assertNonNegativeInteger(earlyDead, "Early dead count");
    if (infertile + earlyDead <= 0) {
      throw new Error("Enter at least one candling count");
    }

    const incubation = await HatcheryIncubationService.lockIncubationBatch(
      tx,
      incubationBatchId,
      hatcheryOwnerId
    );

    if (
      incubation.transferredAt ||
      incubation.stage === HatcheryIncubationStage.HATCHER ||
      incubation.stage === HatcheryIncubationStage.COMPLETED
    ) {
      throw new Error("Candling is locked after transfer to hatcher");
    }

    if (
      incubation.stage !== HatcheryIncubationStage.SETTER &&
      incubation.stage !== HatcheryIncubationStage.CANDLING
    ) {
      throw new Error("Candling can only be recorded before transfer to hatcher");
    }

    const existingCandlingLoss = await tx.hatcheryIncubationLoss.aggregate({
      where: {
        incubationBatchId,
        type: { in: [HatcheryIncubationLossType.INFERTILE, HatcheryIncubationLossType.EARLY_DEAD] },
      },
      _sum: { count: true },
    });
    const totalCandlingLoss =
      (existingCandlingLoss._sum.count ?? 0) + infertile + earlyDead;
    if (totalCandlingLoss > incubation.eggsSetCount) {
      throw new Error(
        `Candling loss cannot exceed eggs set (${incubation.eggsSetCount})`
      );
    }

    const losses: { type: HatcheryIncubationLossType; count: number }[] = [];
    if (infertile > 0) losses.push({ type: HatcheryIncubationLossType.INFERTILE, count: infertile });
    if (earlyDead > 0) losses.push({ type: HatcheryIncubationLossType.EARLY_DEAD, count: earlyDead });

    for (const loss of losses) {
      await tx.hatcheryIncubationLoss.create({
        data: {
          incubationBatchId,
          type: loss.type,
          date,
          count: loss.count,
          note,
        },
      });
    }

    await tx.hatcheryIncubationBatch.update({
      where: { id: incubationBatchId },
      data: { stage: HatcheryIncubationStage.CANDLING, candledAt: date },
    });
  }

  /**
   * Mark transfer to hatcher (setter→hatcher on day 18).
   */
  static async transferToHatcher(
    tx: Prisma.TransactionClient,
    data: { incubationBatchId: string; hatcheryOwnerId: string; date: Date }
  ) {
    const incubation = await HatcheryIncubationService.lockIncubationBatch(
      tx,
      data.incubationBatchId,
      data.hatcheryOwnerId
    );

    if (incubation.stage === HatcheryIncubationStage.COMPLETED) {
      throw new Error("Completed incubation batches cannot be transferred");
    }
    if (incubation.transferredAt || incubation.stage === HatcheryIncubationStage.HATCHER) {
      throw new Error("Incubation batch has already been transferred to hatcher");
    }
    if (
      incubation.stage !== HatcheryIncubationStage.SETTER &&
      incubation.stage !== HatcheryIncubationStage.CANDLING
    ) {
      throw new Error("Only setter or candling stage batches can be transferred");
    }

    await tx.hatcheryIncubationBatch.update({
      where: { id: data.incubationBatchId },
      data: { stage: HatcheryIncubationStage.HATCHER, transferredAt: data.date },
    });
  }

  /**
   * Record hatch results (A/B/CULL counts + late dead + unhatched).
   * - Creates HatcheryHatchResult row
   * - Upserts HatcheryChickStock by grade
   * - Writes HatcheryChickTxn(PRODUCTION) per grade
   * Produced chicks are not mirrored into hatcheryInventoryItem (see Produced Chicks page).
   */
  static async recordHatchResults(
    tx: Prisma.TransactionClient,
    data: {
      incubationBatchId: string;
      hatcheryOwnerId: string;
      date: Date;
      hatchedA: number;
      hatchedB: number;
      cull: number;
      lateDead: number;
      unhatched: number;
      note?: string;
    }
  ) {
    const {
      incubationBatchId,
      hatcheryOwnerId,
      date,
      hatchedA,
      hatchedB,
      cull,
      lateDead,
      unhatched,
      note,
    } = data;

    const counts = [
      { label: "Grade A chicks", value: hatchedA },
      { label: "Grade B chicks", value: hatchedB },
      { label: "Cull count", value: cull },
      { label: "Late dead count", value: lateDead },
      { label: "Unhatched count", value: unhatched },
    ];
    for (const count of counts) {
      HatcheryIncubationService.assertNonNegativeInteger(count.value, count.label);
    }

    const totalOutcome = hatchedA + hatchedB + cull + lateDead + unhatched;
    if (totalOutcome <= 0) {
      throw new Error("Enter at least one hatch result count");
    }

    const incubation = await HatcheryIncubationService.lockIncubationBatch(
      tx,
      incubationBatchId,
      hatcheryOwnerId
    );

    if (incubation.stage === HatcheryIncubationStage.COMPLETED) {
      throw new Error("Completed hatch results cannot be changed");
    }
    if (incubation.stage !== HatcheryIncubationStage.HATCHER || !incubation.transferredAt) {
      throw new Error("Transfer to hatcher before adding hatch results");
    }

    const existingHatchResultCount = await tx.hatcheryHatchResult.count({
      where: { incubationBatchId },
    });
    if (existingHatchResultCount > 0) {
      throw new Error("Hatch result has already been finalized for this incubation");
    }

    const candlingLoss = await tx.hatcheryIncubationLoss.aggregate({
      where: {
        incubationBatchId,
        type: { in: [HatcheryIncubationLossType.INFERTILE, HatcheryIncubationLossType.EARLY_DEAD] },
      },
      _sum: { count: true },
    });
    const fertileEggs = incubation.eggsSetCount - (candlingLoss._sum.count ?? 0);
    if (totalOutcome > fertileEggs) {
      throw new Error(
        `Hatch result total cannot exceed fertile eggs (${fertileEggs})`
      );
    }

    // Save hatch result record
    const hatchResult = await tx.hatcheryHatchResult.create({
      data: { incubationBatchId, date, hatchedA, hatchedB, cull, lateDead, unhatched, note },
    });

    // Process each grade
    const gradeData: Array<{ grade: HatcheryChickGrade; count: number }> = [
      { grade: HatcheryChickGrade.A, count: hatchedA },
      { grade: HatcheryChickGrade.B, count: hatchedB },
      { grade: HatcheryChickGrade.CULL, count: cull },
    ];

    for (const { grade, count } of gradeData) {
      if (count <= 0) continue;

      // Update batch-wise chick stock
      await tx.hatcheryChickStock.upsert({
        where: {
          incubationBatchId_grade: { incubationBatchId, grade },
        },
        update: { currentStock: { increment: count } },
        create: { incubationBatchId, grade, currentStock: count },
      });

      // Write chick txn log
      await tx.hatcheryChickTxn.create({
        data: {
          incubationBatchId,
          grade,
          type: HatcheryChickTxnType.PRODUCTION,
          count,
          date,
          sourceId: hatchResult.id,
          note,
        },
      });
    }

    // Mark stage as COMPLETED
    await tx.hatcheryIncubationBatch.update({
      where: { id: incubationBatchId },
      data: { stage: HatcheryIncubationStage.COMPLETED, hatchedAt: date },
    });

    return hatchResult;
  }

  /**
   * Delete a hatch result and reverse associated chick stock.
   * Also reverts stage back to HATCHER.
   */
  static async deleteHatchResult(
    tx: Prisma.TransactionClient,
    hatchResultId: string,
    hatcheryOwnerId: string
  ) {
    const result = await tx.hatcheryHatchResult.findUniqueOrThrow({
      where: { id: hatchResultId },
      include: { incubationBatch: true },
    });

    if (result.incubationBatch.hatcheryOwnerId !== hatcheryOwnerId) {
      throw new Error("Not authorized");
    }
    if (result.incubationBatch.stage === HatcheryIncubationStage.COMPLETED) {
      throw new Error("Completed hatch results cannot be changed");
    }

    const incubationBatchId = result.incubationBatchId;

    const gradeData: Array<{ grade: HatcheryChickGrade; count: number }> = [
      { grade: HatcheryChickGrade.A, count: result.hatchedA },
      { grade: HatcheryChickGrade.B, count: result.hatchedB },
      { grade: HatcheryChickGrade.CULL, count: result.cull },
    ];

    for (const { grade, count } of gradeData) {
      if (count <= 0) continue;

      // Check for sales before reversing
      const soldCount = await tx.hatcheryChickTxn.aggregate({
        where: {
          incubationBatchId,
          grade,
          type: HatcheryChickTxnType.SALE,
        },
        _sum: { count: true },
      });
      const totalSold = Math.abs(soldCount._sum.count ?? 0);
      const stock = await tx.hatcheryChickStock.findUnique({
        where: { incubationBatchId_grade: { incubationBatchId, grade } },
      });
      if (stock && stock.currentStock < count) {
        throw new Error(
          `Cannot delete hatch result: Grade ${grade} chicks have been partially sold (${totalSold} sold). Delete sales first.`
        );
      }

      // Revert batch-wise chick stock
      await tx.hatcheryChickStock.update({
        where: { incubationBatchId_grade: { incubationBatchId, grade } },
        data: { currentStock: { decrement: count } },
      });

      // Delete production chick txns linked to this result
      await tx.hatcheryChickTxn.deleteMany({
        where: {
          incubationBatchId,
          grade,
          type: HatcheryChickTxnType.PRODUCTION,
          sourceId: hatchResultId,
        },
      });
    }

    await tx.hatcheryHatchResult.delete({ where: { id: hatchResultId } });

    // Revert stage to HATCHER
    await tx.hatcheryIncubationBatch.update({
      where: { id: incubationBatchId },
      data: { stage: HatcheryIncubationStage.HATCHER, hatchedAt: null },
    });
  }
}
