"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Pencil,
  Trash2,
  Type,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";

import { AccountFormModal } from "@/components/cashflow/AccountFormModal";
import { CashflowDeleteConfirmDialog } from "@/components/cashflow/CashflowDeleteConfirmDialog";

import {
  useCreateBankAccount,
  useDeleteAccount,
  useGetCashflowAccounts,
  usePatchAccount,
  type CashAccount,
} from "@/fetchers/hatchery/hatcheryCashflowQueries";
import { formatCashAmount } from "@/components/cash-in-hand/cashFormat";
import { accountNote } from "@/components/cashflow/cashflowText";

type EditState =
  | { mode: "add" }
  | { mode: "edit"; account: CashAccount };

export default function HatcheryCashflowAccountsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const accountsQ = useGetCashflowAccounts(showArchived);
  const create = useCreateBankAccount();
  const patch = usePatchAccount();
  const del = useDeleteAccount();

  const [modal, setModal] = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CashAccount | null>(null);

  const accounts = accountsQ.data ?? [];
  const sorted = useMemo(
    () =>
      [...accounts].sort((a, b) => {
        if (a.type !== b.type) return a.type === "CASH" ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [accounts],
  );

  async function handleRename(a: CashAccount) {
    const next = window.prompt("New account name", a.name);
    if (!next || next.trim() === a.name) return;
    try {
      await patch.mutateAsync({ id: a.id, payload: { name: next.trim() } });
      toast.success("Renamed");
    } catch (e: unknown) {
      toast.error(message(e, "Rename failed"));
    }
  }

  async function handleArchiveToggle(a: CashAccount) {
    const archiving = a.archivedAt === null;
    try {
      await patch.mutateAsync({
        id: a.id,
        payload: { archived: archiving },
      });
      toast.success(archiving ? "Archived" : "Restored");
    } catch (e: unknown) {
      toast.error(message(e, archiving ? "Archive failed" : "Restore failed"));
    }
  }

  async function confirmDelete(password: string) {
    if (!deleteTarget) return;
    try {
      await del.mutateAsync({ id: deleteTarget.id, password });
      toast.success("Account deleted");
      setDeleteTarget(null);
    } catch (e: unknown) {
      toast.error(message(e, "Delete failed"));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/hatchery/dashboard/cashflow"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="inline h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">Accounts</h1>
        </div>
        <Button onClick={() => setModal({ mode: "add" })}>
          Add bank account
        </Button>
      </header>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
        Show archived
      </label>

      <Card>
        <CardContent className="py-3">
          <ul className="divide-y divide-gray-100">
            {sorted.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                No accounts yet.
              </li>
            )}
            {sorted.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.name}</span>
                    {a.archivedAt && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-muted-foreground">
                        archived
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {accountNote(a)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="tabular-nums">
                    {formatCashAmount(a.balance)}
                  </span>
                  {a.type === "CASH" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setModal({ mode: "edit", account: a })}
                      title="Count your cash"
                      aria-label="Count your cash"
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      {a.openingBalanceSetAt ? "Recount cash" : "Set cash"}
                    </Button>
                  )}
                  {a.type === "BANK" && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setModal({ mode: "edit", account: a })}
                        title="Edit opening balance"
                        aria-label="Edit opening balance"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRename(a)}
                        title="Rename"
                        aria-label="Rename"
                      >
                        <Type className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveToggle(a)}
                        title={a.archivedAt ? "Unarchive" : "Archive"}
                        aria-label={a.archivedAt ? "Unarchive" : "Archive"}
                      >
                        {a.archivedAt ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(a)}
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <AccountFormModal
        open={modal?.mode === "add"}
        onOpenChange={(v) => !v && setModal(null)}
        submitting={create.isPending}
        onSubmit={async (input) => {
          try {
            await create.mutateAsync(input);
            toast.success("Account added");
          } catch (e: unknown) {
            toast.error(message(e, "Could not add account"));
            throw e;
          }
        }}
      />

      <CashflowDeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete account?"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This cannot be undone. If it has entries, delete those first or archive it instead.`
            : ""
        }
        confirmLabel="Delete account"
        submitting={del.isPending}
        onConfirm={confirmDelete}
      />

      <AccountFormModal
        open={modal?.mode === "edit"}
        onOpenChange={(v) => !v && setModal(null)}
        submitting={patch.isPending}
        editingAccountId={modal?.mode === "edit" ? modal.account.id : undefined}
        initial={
          modal?.mode === "edit"
            ? {
                name: modal.account.name,
                openingBalance:
                  modal.account.type === "CASH"
                    ? modal.account.openingBalanceSetAt
                      ? modal.account.balance
                      : 0
                    : modal.account.openingBalance,
                openingBsDate: modal.account.openingBsDate,
              }
            : undefined
        }
        allowOpeningEdit={
          modal?.mode === "edit" &&
          (modal.account.type === "CASH" || !modal.account.hasMovements)
        }
        isCashAccount={
          modal?.mode === "edit" && modal.account.type === "CASH"
        }
        onSubmit={async (input) => {
          if (modal?.mode !== "edit") return;
          const acc = modal.account;
          try {
            const tasks: Promise<unknown>[] = [];
            if (input.name !== acc.name) {
              tasks.push(
                patch.mutateAsync({
                  id: acc.id,
                  payload: { name: input.name },
                }),
              );
            }
            if (acc.type === "CASH" || input.openingBalance !== acc.openingBalance) {
              tasks.push(
                patch.mutateAsync({
                  id: acc.id,
                  payload: { openingBalance: input.openingBalance },
                }),
              );
            }
            if (tasks.length === 0) {
              setModal(null);
              return;
            }
            await Promise.all(tasks);
            toast.success(acc.type === "CASH" ? "Cash saved" : "Account updated");
          } catch (e: unknown) {
            toast.error(message(e, "Could not update account"));
            throw e;
          }
        }}
      />
    </div>
  );
}

function message(e: unknown, fallback: string): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  );
}
