import { Request, Response } from "express";
import bcrypt from "bcrypt";
import type { CashCategory } from "@prisma/client";
import prisma from "../utils/prisma";
import {
  CashflowError,
  archiveAccount,
  createBankAccount,
  deleteAccount as deleteAccountService,
  deleteMovement as deleteMovementService,
  editOpeningBalance,
  ensureCashAccount,
  getAccountBalances,
  getReport,
  listAccounts,
  listMovements,
  postManualMovement,
  postTransfer,
  renameAccount,
  unarchiveAccount,
} from "../services/farmerCashflowService";
import { writeBusinessAudit } from "../services/businessAuditService";
import { getNepalBsTodayString } from "../utils/nepalBsDate";

function handle(err: unknown, res: Response, scope: string): Response {
  if (err instanceof CashflowError) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(`${scope} error:`, err);
  return res.status(500).json({ message: "Internal server error" });
}

/** Require the password of the person who is signed in before a hard delete. */
async function assertDeletePassword(req: Request): Promise<void> {
  const password = req.body?.password;
  if (typeof password !== "string" || password.length === 0) {
    throw new CashflowError("Password confirmation is required", 400);
  }

  const hash = req.actorType === "STAFF"
    ? (
        await prisma.staffUser.findUnique({
          where: { id: req.staffUserId },
          select: { passwordHash: true },
        })
      )?.passwordHash
    : (
        await prisma.user.findUnique({
          where: { id: req.userId },
          select: { password: true },
        })
      )?.password;

  if (!hash || !(await bcrypt.compare(password, hash))) {
    throw new CashflowError("Invalid password. Deletion cancelled.", 401);
  }
}

export const getAccounts = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId!;
    await ensureCashAccount(userId);
    const includeArchived = req.query.includeArchived === "true";
    // Cap at Nepal-today so a back-dated tomorrow-expense doesn't show up in
    // "Account balances" before it's actually posted. Without this the top
    // card and the cashflow statement (which respects the selected range)
    // disagree whenever a user books a future-dated sale or expense.
    const asOfBsDate = getNepalBsTodayString();
    const accounts = await getAccountBalances(userId, {
      includeArchived,
      asOfBsDate,
    });
    return res.status(200).json({ success: true, data: { accounts } });
  } catch (err) {
    return handle(err, res, "farmerCashflow.getAccounts");
  }
};

export const createAccount = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { name, openingBalance, openingBsDate } = req.body ?? {};
    const parsedOpening = Number(openingBalance);
    const created = await createBankAccount(userId, {
      name: String(name ?? ""),
      openingBalance: Number.isFinite(parsedOpening) ? parsedOpening : NaN,
      openingBsDate: String(openingBsDate ?? ""),
    });
    await writeBusinessAudit(req, {
      action: "cashflow.account.created",
      targetType: "CashAccount",
      targetId: created.id,
      description: `Bank account "${created.name}" added`,
      metadata: {
        openingBalance: created.openingBalance,
        openingBsDate: created.openingBsDate,
      },
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return handle(err, res, "farmerCashflow.createAccount");
  }
};

export const patchAccount = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json({ message: "Account id is required" });
    }
    const body = req.body ?? {};

    // Supported in-place edits: name, openingBalance, archived (bool).
    // Exactly one semantic action per call to keep audit entries meaningful.
    const actions = [
      body.name !== undefined ? "name" : null,
      body.openingBalance !== undefined ? "openingBalance" : null,
      body.archived !== undefined ? "archived" : null,
    ].filter(Boolean);
    if (actions.length === 0) {
      return res.status(400).json({
        message: "Provide one of: name, openingBalance, archived",
      });
    }
    if (actions.length > 1) {
      return res.status(400).json({
        message: "Only one of name, openingBalance, archived may be updated per request",
      });
    }

    if (body.name !== undefined) {
      const updated = await renameAccount(userId, id, String(body.name));
      await writeBusinessAudit(req, {
        action: "cashflow.account.renamed",
        targetType: "CashAccount",
        targetId: id,
        description: `Account renamed to "${updated.name}"`,
      });
      return res.status(200).json({ success: true, data: updated });
    }

    if (body.openingBalance !== undefined) {
      const next = Number(body.openingBalance);
      const before = (await listAccounts(userId, { includeArchived: true })).find(
        (a) => a.id === id,
      );
      const updated = await editOpeningBalance(userId, id, next);
      await writeBusinessAudit(req, {
        action: "cashflow.account.opening_edited",
        targetType: "CashAccount",
        targetId: id,
        description: `Opening balance set to ${updated.openingBalance}`,
        metadata: {
          previous: before?.openingBalance ?? null,
          next: updated.openingBalance,
        },
      });
      return res.status(200).json({ success: true, data: updated });
    }

    // archived toggle
    const next = Boolean(body.archived);
    const updated = next
      ? await archiveAccount(userId, id)
      : await unarchiveAccount(userId, id);
    await writeBusinessAudit(req, {
      action: next ? "cashflow.account.archived" : "cashflow.account.unarchived",
      targetType: "CashAccount",
      targetId: id,
      description: `Account ${next ? "archived" : "restored"}: ${updated.name}`,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return handle(err, res, "farmerCashflow.patchAccount");
  }
};

export const deleteAccount = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json({ message: "Account id is required" });
    }
    // Hard-delete needs the signed-in user's password. Reversible edits
    // (rename / archive / opening-balance) do not — they can be undone via
    // the UI without touching the audit trail of a destroyed row.
    await assertDeletePassword(req);
    // Fetch the name up front for a useful audit log entry — the row is gone
    // after the service call.
    const existing = (
      await listAccounts(userId, { includeArchived: true })
    ).find((a) => a.id === id);
    await deleteAccountService(userId, id);
    await writeBusinessAudit(req, {
      action: "cashflow.account.deleted",
      targetType: "CashAccount",
      targetId: id,
      description: `Account deleted: ${existing?.name ?? id}`,
    });
    return res.status(204).end();
  } catch (err) {
    return handle(err, res, "farmerCashflow.deleteAccount");
  }
};

export const deleteMovement = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json({ message: "Movement id is required" });
    }
    await assertDeletePassword(req);
    const { deletedIds } = await deleteMovementService(userId, id);
    await writeBusinessAudit(req, {
      action: "cashflow.movement.deleted",
      targetType: "CashMovement",
      targetId: id,
      description:
        deletedIds.length > 1
          ? `Transfer removed (${deletedIds.length} legs)`
          : `Movement deleted`,
      metadata: { deletedIds },
    });
    return res.status(204).end();
  } catch (err) {
    return handle(err, res, "farmerCashflow.deleteMovement");
  }
};

export const getMovements = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.userId!;
    const fromBsDate =
      typeof req.query.from === "string" ? req.query.from : undefined;
    const toBsDate =
      typeof req.query.to === "string" ? req.query.to : undefined;
    const accountId =
      typeof req.query.accountId === "string" && req.query.accountId.length > 0
        ? req.query.accountId
        : undefined;
    const limit =
      typeof req.query.limit === "string"
        ? Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000)
        : undefined;
    const movements = await listMovements(userId, {
      fromBsDate,
      toBsDate,
      accountId,
      limit,
    });
    return res.status(200).json({ success: true, data: { movements } });
  } catch (err) {
    return handle(err, res, "farmerCashflow.getMovements");
  }
};

export const createMovement = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.userId!;
    const recordedById = req.actorType === "STAFF"
      ? req.staffUserId ?? userId
      : userId;
    const body = req.body ?? {};
    const movement = await postManualMovement(userId, recordedById, {
      accountId: String(body.accountId ?? ""),
      category: String(body.category ?? "") as CashCategory,
      amount: Number(body.amount),
      bsDate: String(body.bsDate ?? ""),
      partyName: body.partyName,
      notes: body.notes,
    });
    await writeBusinessAudit(req, {
      action: "cashflow.movement.manual_added",
      targetType: "CashMovement",
      targetId: movement.id,
      description: `Manual ${movement.direction} ${movement.amount} on ${movement.bsDate} (${movement.category})`,
      metadata: {
        accountId: movement.accountId,
        category: movement.category,
        amount: movement.amount,
        bsDate: movement.bsDate,
      },
    });
    return res.status(201).json({ success: true, data: movement });
  } catch (err) {
    return handle(err, res, "farmerCashflow.createMovement");
  }
};

export const createTransfer = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.userId!;
    const recordedById = req.actorType === "STAFF"
      ? req.staffUserId ?? userId
      : userId;
    const body = req.body ?? {};
    const result = await postTransfer(userId, recordedById, {
      fromAccountId: String(body.fromAccountId ?? ""),
      toAccountId: String(body.toAccountId ?? ""),
      amount: Number(body.amount),
      bsDate: String(body.bsDate ?? ""),
      note: body.note,
    });
    await writeBusinessAudit(req, {
      action: "cashflow.transfer.posted",
      targetType: "CashMovement",
      targetId: result.transferId,
      description: `Transfer ${result.legs[0].amount} on ${result.legs[0].bsDate}`,
      metadata: {
        transferId: result.transferId,
        fromAccountId: result.legs[0].accountId,
        toAccountId: result.legs[1].accountId,
        amount: result.legs[0].amount,
        bsDate: result.legs[0].bsDate,
      },
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return handle(err, res, "farmerCashflow.createTransfer");
  }
};

export const getReportHandler = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.userId!;
    const fromBsDate =
      typeof req.query.from === "string" ? req.query.from : "";
    const toBsDate =
      typeof req.query.to === "string" ? req.query.to : "";
    if (!fromBsDate || !toBsDate) {
      return res.status(400).json({
        message: "from and to BS date query params are required",
      });
    }
    const report = await getReport(userId, { fromBsDate, toBsDate });
    return res.status(200).json({ success: true, data: report });
  } catch (err) {
    return handle(err, res, "farmerCashflow.getReport");
  }
};
