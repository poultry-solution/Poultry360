"use client";

import { Card, CardContent } from "@/common/components/ui/card";
import type {
  CashCategory,
  CashflowReport,
} from "@/fetchers/farmer/farmerCashflowQueries";

type MovementForSplit = {
  bsDate: string;
  amount: number;
  sourceType: string;
  /** False when the entry is already inside the counted cash / bank start amount. */
  countedInBalance?: boolean;
};
import { formatCashAmount } from "@/components/cash-in-hand/cashFormat";
import { formatBsLong } from "@/components/cashflow/cashflowText";

const CATEGORY_LABEL: Record<CashCategory, string> = {
  CASH_IN: "Cash in",
  CASH_OUT: "Cash out",
  SALE_RECEIPT: "Money received",
  EXPENSE: "Expenses",
  PAYMENT_TO_DEALER: "Payments to suppliers",
  OWNER_INVEST: "Owner invest",
  OWNER_DRAW: "Owner draw",
  LOAN_RECEIVED: "Loans received",
  LOAN_REPAYMENT: "Loan repayments",
  TRANSFER: "Transfers",
  OPENING_ADJUSTMENT: "Cash corrections",
};

interface CashflowStatementProps {
  report: CashflowReport;
  /** Optional list of in-range movements. Used to split a few sourceTypes out
   * of their parent category (salary out of EXPENSE, broiler payout out of
   * CASH_OUT) so the dealer summary shows what the money actually was. */
  movements?: MovementForSplit[];
  role?: "OWNER" | "DEALER" | "COMPANY";
}

export function CashflowStatement({ report, movements, role = "OWNER" }: CashflowStatementProps) {
  const { from, to } = { from: report.range.fromBsDate, to: report.range.toBsDate };
  const sumBySource = (sourceType: string) =>
    (movements ?? [])
      .filter(
        (m) =>
          m.countedInBalance !== false &&
          m.bsDate >= from &&
          m.bsDate <= to &&
          m.sourceType === sourceType,
      )
      .reduce((s, m) => s + Number(m.amount), 0);

  // Dealer and company: salary shows as its own line, not inside Expenses.
  const salaryTotal = role === "DEALER" || role === "COMPANY" ? sumBySource("STAFF_PAYMENT") : 0;
  const broilerPayoutTotal = role === "DEALER" ? sumBySource("BROILER_SETTLEMENT_PAYOUT") : 0;
  const inflowRows = Object.entries(report.byCategory.inflow)
    .filter(([cat, v]) => v > 0 && cat !== "TRANSFER")
    .sort((a, b) => b[1] - a[1]);
  const outflowRows = Object.entries(report.byCategory.outflow)
    .map(([cat, v]) => {
      // Dealer-side: carve salary out of EXPENSE and broiler payout out of
      // CASH_OUT so the summary shows them as the separate things they are.
      if (cat === "EXPENSE") return [cat, v - salaryTotal] as const;
      if (cat === "CASH_OUT") return [cat, v - broilerPayoutTotal] as const;
      return [cat, v] as const;
    })
    .filter(([cat, v]) => v > 0 && cat !== "TRANSFER")
    .sort((a, b) => b[1] - a[1]);

  // Accounts whose opening date falls inside this period — their openingBalance
  // is folded into the Opening balance total. Showing the per-account breakdown
  // underneath makes the aggregate legible ("why is my 5k showing as 10k?" —
  // because another account also opened in-period).
  const periodOpeningAccounts = report.balances.filter(
    (a) =>
      a.openingBsDate >= report.range.fromBsDate &&
      a.openingBsDate <= report.range.toBsDate &&
      a.openingBalance > 0,
  );

  // Cash counted after the period began: days before the count are not in
  // this summary (that money is already inside the counted amount).
  const cashAccount = report.balances.find((a) => a.type === "CASH");
  const cashStartsLater =
    cashAccount?.openingBalanceSetAt &&
    cashAccount.openingBsDate > report.range.fromBsDate &&
    cashAccount.openingBsDate <= report.range.toBsDate;

  const transfersShown =
    report.transfers.in > 0 || report.transfers.out > 0;

  return (
    <Card>
      <CardContent className="py-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Money in and out
        </h2>
        {cashStartsLater && cashAccount && (
          <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            You counted your cash on {formatBsLong(cashAccount.openingBsDate)}.
            Entries before that are not in this summary.
          </p>
        )}

        <Row label="Money at start" value={report.totals.openingBalance} />
        {periodOpeningAccounts.length > 0 && (
          <div className="ml-4 border-l-2 border-gray-100 pl-3">
            {periodOpeningAccounts.map((a) => (
              <Row
                key={a.id}
                label={a.type === "CASH" ? "Cash you counted" : `${a.name} start amount`}
                value={a.openingBalance}
                muted
              />
            ))}
          </div>
        )}

        <Section title="Money in">
          {inflowRows.length === 0 && <Empty />}
          {inflowRows.map(([cat, v]) => (
            <Row
              key={cat}
              label={CATEGORY_LABEL[cat as CashCategory]}
              value={v}
            />
          ))}
          <Row label="Total money in" value={report.totals.inflow} muted />
        </Section>

        <Section title="Money out">
          {outflowRows.length === 0 && salaryTotal === 0 && broilerPayoutTotal === 0 && <Empty />}
          {outflowRows.map(([cat, v]) => (
            <Row
              key={cat}
              label={CATEGORY_LABEL[cat as CashCategory]}
              value={-v}
            />
          ))}
          {salaryTotal > 0 && <Row label="Salary" value={-salaryTotal} />}
          {broilerPayoutTotal > 0 && (
            <Row label="Paid to broiler farmers" value={-broilerPayoutTotal} />
          )}
          <Row label="Total money out" value={-report.totals.outflow} muted />
        </Section>

        {transfersShown && (
          <Section title="Transfers (between accounts, net 0)">
            <Row label="Transfers in" value={report.transfers.in} />
            <Row label="Transfers out" value={-report.transfers.out} />
          </Section>
        )}

        <div className="mt-4 border-t border-gray-200 pt-3">
          <Row
            label="Net change"
            value={report.totals.netChange}
            emphasize
          />
          <Row
            label="Closing balance"
            value={report.totals.closingBalance}
            emphasize
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  muted = false,
  emphasize = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between py-1 text-sm",
        emphasize ? "font-semibold" : "",
        muted ? "text-muted-foreground" : "",
      ].join(" ")}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatCashAmount(value)}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="py-1 text-sm text-muted-foreground">—</div>;
}
