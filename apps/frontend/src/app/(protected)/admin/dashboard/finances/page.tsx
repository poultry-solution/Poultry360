"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark, Plus } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/common/components/ui/table";
import { useCreateAdminExpense, useGetAdminFinanceOverview } from "@/fetchers/admin/adminFinanceQueries";
import { toast } from "sonner";

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
  }).format(value);
}

function SummaryCard({
  title,
  amount,
  icon: Icon,
  tone,
}: {
  title: string;
  amount: number;
  icon: typeof Landmark;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className={`flex size-10 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-xl font-bold">{formatAmount(amount)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminFinancesPage() {
  const { data, isLoading, isError, refetch } = useGetAdminFinanceOverview();
  const createExpense = useCreateAdminExpense();
  const [expense, setExpense] = useState({
    description: "",
    amount: "",
    spentAt: new Date().toISOString().slice(0, 10),
  });
  const finance = data?.data;

  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(expense.amount);
    if (!expense.description.trim() || !Number.isFinite(amount) || amount <= 0 || !expense.spentAt) {
      toast.error("Enter an expense description, positive amount, and date");
      return;
    }

    try {
      await createExpense.mutateAsync({
        description: expense.description.trim(),
        amount,
        spentAt: expense.spentAt,
      });
      setExpense({ description: "", amount: "", spentAt: new Date().toISOString().slice(0, 10) });
      toast.success("Expense recorded");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not record expense");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finances</h1>
        <p className="mt-1 text-muted-foreground">
          Simple cash-flow tracking from real customer payments and admin-entered expenses. Test-account payments are excluded.
        </p>
      </div>

      {isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-muted-foreground">Could not load finance records.</p>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard title="Income" amount={finance?.totalIncome ?? 0} icon={ArrowDownLeft} tone="bg-emerald-100 text-emerald-700" />
            <SummaryCard title="Expenses" amount={finance?.totalExpenses ?? 0} icon={ArrowUpRight} tone="bg-rose-100 text-rose-700" />
            <SummaryCard title="Balance" amount={finance?.balance ?? 0} icon={Landmark} tone="bg-sky-100 text-sky-700" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="size-4" /> Record expense</CardTitle>
              <CardDescription>Use a short description, amount, and date only.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitExpense} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="expense-description">Expense description</Label>
                  <Input
                    id="expense-description"
                    required
                    maxLength={160}
                    placeholder="e.g. Server hosting"
                    value={expense.description}
                    onChange={(event) => setExpense((current) => ({ ...current, description: event.target.value }))}
                    disabled={createExpense.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Amount</Label>
                  <Input
                    id="expense-amount"
                    required
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    type="number"
                    value={expense.amount}
                    onChange={(event) => setExpense((current) => ({ ...current, amount: event.target.value }))}
                    disabled={createExpense.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-date">Expense date</Label>
                  <Input
                    id="expense-date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    type="date"
                    value={expense.spentAt}
                    onChange={(event) => setExpense((current) => ({ ...current, spentAt: event.target.value }))}
                    disabled={createExpense.isPending}
                  />
                </div>
                <Button disabled={createExpense.isPending}>{createExpense.isPending ? "Saving..." : "Add expense"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cash-flow ledger</CardTitle>
              <CardDescription>Payments are income; expenses reduce the running balance.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading finances...</p>
              ) : finance?.entries.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No income or expenses recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expense</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finance?.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">{new Date(entry.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <p className="font-medium">{entry.description}</p>
                            {entry.reference && <p className="text-xs text-muted-foreground">{entry.reference}</p>}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-700">
                            {entry.income ? formatAmount(entry.income) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-rose-700">
                            {entry.expense ? formatAmount(entry.expense) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatAmount(entry.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
