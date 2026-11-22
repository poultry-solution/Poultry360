"use client";

import { Card, CardContent } from "@/common/components/ui/card";
import type {
  CashCategory,
  CashflowReport,
} from "@/fetchers/farmer/farmerCashflowQueries";
import { formatCashAmount } from "@/components/cash-in-hand/cashFormat";

const CATEGORY_LABEL: Record<CashCategory, string> = {
  CASH_IN: "Cash in",
  CASH_OUT: "Cash out",
  SALE_RECEIPT: "Sale receipts",
  EXPENSE: "Expenses",
  PAYMENT_TO_DEALER: "Payments to dealer",
  OWNER_INVEST: "Owner invest",
  OWNER_DRAW: "Owner draw",
  LOAN_RECEIVED: "Loans received",
  LOAN_REPAYMENT: "Loan repayments",
  TRANSFER: "Transfers",
  OPENING_ADJUSTMENT: "Opening adjustments",
};

interface CashflowStatementProps {
  report: CashflowReport;
}

export function CashflowStatement({ report }: CashflowStatementProps) {
  const inflowRows = Object.entries(report.byCategory.inflow)
    .filter(([cat, v]) => v > 0 && cat !== "TRANSFER")
    .sort((a, b) => b[1] - a[1]);
  const outflowRows = Object.entries(report.byCategory.outflow)
    .filter(([cat, v]) => v > 0 && cat !== "TRANSFER")
    .sort((a, b) => b[1] - a[1]);

  const transfersShown =
    report.transfers.in > 0 || report.transfers.out > 0;

  return (
    <Card>
      <CardContent className="py-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Cashflow statement
        </h2>

        <Row label="Opening balance" value={report.totals.openingBalance} />
        {report.totals.accountOpeningBalance > 0 && (
          <Row
            label="Account opening balance added in this period"
            value={report.totals.accountOpeningBalance}
          />
        )}

        <Section title="Inflow">
          {inflowRows.length === 0 && <Empty />}
          {inflowRows.map(([cat, v]) => (
            <Row
              key={cat}
              label={CATEGORY_LABEL[cat as CashCategory]}
              value={v}
            />
          ))}
          <Row label="Total inflow" value={report.totals.inflow} muted />
        </Section>

        <Section title="Outflow">
          {outflowRows.length === 0 && <Empty />}
          {outflowRows.map(([cat, v]) => (
            <Row
              key={cat}
              label={CATEGORY_LABEL[cat as CashCategory]}
              value={-v}
            />
          ))}
          <Row label="Total outflow" value={-report.totals.outflow} muted />
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
