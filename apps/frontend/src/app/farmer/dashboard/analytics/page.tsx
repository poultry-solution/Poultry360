"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowUpDown,
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Download,
  DollarSign,
  Egg,
  FileText,
  HeartPulse,
  Layers3,
  Pill,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wheat,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/common/components/ui/chart";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import {
  FarmerAnalyticsBatchStatus,
  FarmerAnalyticsBatchType,
  FarmerAnalyticsGroupBy,
  FarmerAnalyticsOverviewParams,
  FarmerReportAnalytics,
  FarmerReportType,
  useGetFarmerFinanceAnalytics,
  useGetFarmerFlockComparisonAnalytics,
  useGetFarmerOperationsAnalytics,
  useGetFarmerProductionAnalytics,
  useGetFarmerReportAnalytics,
  useGetFarmerAnalyticsOverview,
} from "@/fetchers/analytics/farmerAnalyticsQueries";

type DatePreset =
  | "today"
  | "7days"
  | "30days"
  | "thisMonth"
  | "lastMonth"
  | "custom";
type FlockSortKey =
  | "batchNumber"
  | "ageDays"
  | "initialBirds"
  | "currentBirds"
  | "mortalityRate"
  | "revenue"
  | "expense"
  | "profit"
  | "costPerBird"
  | "profitPerBird";

const reportTypeLabels: Record<FarmerReportType, string> = {
  daily: "Daily report",
  weekly: "Weekly report",
  monthly: "Monthly report",
  batch: "Batch/flock report",
  expense: "Expense report",
  sales: "Sales report",
  mortality: "Mortality report",
  "egg-production": "Egg production report",
};

const datePresetLabels: Record<DatePreset, string> = {
  today: "Today",
  "7days": "7 days",
  "30days": "30 days",
  thisMonth: "This month",
  lastMonth: "Last month",
  custom: "Custom",
};

const groupByLabels: Record<FarmerAnalyticsGroupBy, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const financeChartConfig = {
  revenue: {
    label: "Revenue",
    color: "#15803d",
  },
  expenses: {
    label: "Expenses",
    color: "#c2410c",
  },
  profit: {
    label: "Profit",
    color: "#2563eb",
  },
} satisfies ChartConfig;

const flockChartConfig = {
  profit: {
    label: "Profit",
    color: "#2563eb",
  },
  costPerBird: {
    label: "Cost per bird",
    color: "#7c3aed",
  },
} satisfies ChartConfig;

const operationsChartConfig = {
  naturalDeaths: {
    label: "Natural Deaths",
    color: "#dc2626",
  },
  quantity: {
    label: "Quantity",
    color: "#15803d",
  },
  cost: {
    label: "Cost",
    color: "#7c3aed",
  },
} satisfies ChartConfig;

const productionChartConfig = {
  eggsProduced: {
    label: "Eggs Produced",
    color: "#ca8a04",
  },
  eggsSold: {
    label: "Eggs Sold",
    color: "#2563eb",
  },
  salesRevenue: {
    label: "Sales Revenue",
    color: "#15803d",
  },
} satisfies ChartConfig;

const expenseColors = [
  "#15803d",
  "#2563eb",
  "#c2410c",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#be123c",
  "#4b5563",
];

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetRange(preset: DatePreset): { startDate: string; endDate: string } {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);

  if (preset === "today") {
    return {
      startDate: formatInputDate(start),
      endDate: formatInputDate(end),
    };
  }

  if (preset === "7days") {
    start.setDate(end.getDate() - 6);
    return {
      startDate: formatInputDate(start),
      endDate: formatInputDate(end),
    };
  }

  if (preset === "30days") {
    start.setDate(end.getDate() - 29);
    return {
      startDate: formatInputDate(start),
      endDate: formatInputDate(end),
    };
  }

  if (preset === "lastMonth") {
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    return {
      startDate: formatInputDate(lastMonthStart),
      endDate: formatInputDate(lastMonthEnd),
    };
  }

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    startDate: formatInputDate(thisMonthStart),
    endDate: formatInputDate(end),
  };
}

function formatMoney(value: number): string {
  return `₹${Number(value || 0).toLocaleString()}`;
}

function formatCompactMoney(value: number): string {
  const number = Number(value || 0);
  if (Math.abs(number) >= 10000000) return `₹${(number / 10000000).toFixed(1)}Cr`;
  if (Math.abs(number) >= 100000) return `₹${(number / 100000).toFixed(1)}L`;
  if (Math.abs(number) >= 1000) return `₹${(number / 1000).toFixed(1)}K`;
  return `₹${number.toLocaleString()}`;
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString();
}

function formatPercent(value: number): string {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatReportValue(
  value: string | number | null | undefined,
  format?: "money" | "percent"
): string {
  if (value === null || value === undefined) return "-";
  if (format === "money") return formatMoney(Number(value));
  if (format === "percent") return formatPercent(Number(value));
  if (typeof value === "number") return Number.isInteger(value) ? formatNumber(value) : value.toFixed(2);
  return value;
}

function downloadBlob(fileName: string, mimeType: string, content: BlobPart) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function exportReportCsv(report: FarmerReportAnalytics) {
  const header = report.columns.map((column) => escapeCsv(column.label)).join(",");
  const rows = report.rows.map((row) =>
    report.columns
      .map((column) =>
        escapeCsv(formatReportValue(row[column.key], column.format))
      )
      .join(",")
  );
  downloadBlob(
    `${report.reportType}-report.csv`,
    "text/csv;charset=utf-8",
    [header, ...rows].join("\n")
  );
}

function sanitizePdfText(value: string): string {
  return value
    .replace(/₹/g, "Rs ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function makePdfContentLines(report: FarmerReportAnalytics): string[] {
  const lines = [
    report.title,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    "",
    ...report.summary.map((item) => `${item.label}: ${formatReportValue(item.value)}`),
    "",
    report.columns.map((column) => column.label).join(" | "),
    "-".repeat(110),
    ...report.rows.map((row) =>
      report.columns
        .map((column) => formatReportValue(row[column.key], column.format))
        .join(" | ")
    ),
  ];
  return lines.map((line) => line.slice(0, 150));
}

function createSimplePdf(report: FarmerReportAnalytics): string {
  const lines = makePdfContentLines(report);
  const pageLineCount = 34;
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += pageLineCount) {
    pages.push(lines.slice(index, index + pageLineCount));
  }

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const pageObjectNumbers: number[] = [];

  pages.forEach((pageLines) => {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    const content = [
      "BT",
      "/F1 10 Tf",
      "12 TL",
      "40 555 Td",
      ...pageLines.map((line) => `(${sanitizePdfText(line)}) Tj T*`),
      "ET",
    ].join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers
    .map((number) => `${number} 0 R`)
    .join(" ")}] /Count ${pageObjectNumbers.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function exportReportPdf(report: FarmerReportAnalytics) {
  downloadBlob(
    `${report.reportType}-report.pdf`,
    "application/pdf",
    createSimplePdf(report)
  );
}

function SummaryCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
  isLoading,
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof BarChart3;
  tone?: "neutral" | "positive" | "warning" | "danger";
  isLoading: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-green-700 bg-green-50"
      : tone === "warning"
        ? "text-amber-700 bg-amber-50"
        : tone === "danger"
          ? "text-red-700 bg-red-50"
          : "text-gray-700 bg-gray-100";

  return (
    <Card className="rounded-lg py-5">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="mt-2 text-2xl font-bold text-gray-950">
              {isLoading ? "..." : value}
            </p>
          </div>
          <div className={`rounded-md p-2 ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-xs text-gray-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChartState({ text }: { text: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed text-sm text-gray-500">
      {text}
    </div>
  );
}

function ComingSoonPanel({ title }: { title: string }) {
  return (
    <Card className="rounded-lg py-8">
      <CardContent>
        <div className="flex min-h-[180px] items-center justify-center text-center">
          <div>
            <p className="text-lg font-semibold text-gray-950">{title}</p>
            <p className="mt-2 text-sm text-gray-500">Coming in the next phase.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FarmerAnalyticsPage() {
  const [farmId, setFarmId] = useState("all");
  const [batchType, setBatchType] = useState("all");
  const [batchId, setBatchId] = useState("all");
  const [status, setStatus] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("thisMonth");
  const [customStartDate, setCustomStartDate] = useState(
    () => getPresetRange("thisMonth").startDate
  );
  const [customEndDate, setCustomEndDate] = useState(
    () => getPresetRange("thisMonth").endDate
  );
  const [groupBy, setGroupBy] = useState<FarmerAnalyticsGroupBy>("daily");
  const [flockSortKey, setFlockSortKey] = useState<FlockSortKey>("profit");
  const [flockSortDirection, setFlockSortDirection] = useState<"asc" | "desc">(
    "desc"
  );
  const [reportType, setReportType] = useState<FarmerReportType>("daily");

  const dateRange = useMemo(() => {
    if (datePreset === "custom") {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }
    return getPresetRange(datePreset);
  }, [customEndDate, customStartDate, datePreset]);

  const queryParams = useMemo<FarmerAnalyticsOverviewParams>(
    () => ({
      farmId: farmId === "all" ? undefined : farmId,
      batchId: batchId === "all" ? undefined : batchId,
      batchType:
        batchType === "all" ? undefined : (batchType as FarmerAnalyticsBatchType),
      status: status === "all" ? undefined : (status as FarmerAnalyticsBatchStatus),
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
      groupBy,
    }),
    [batchId, batchType, dateRange.endDate, dateRange.startDate, farmId, groupBy, status]
  );

  const { data, isLoading, isError } =
    useGetFarmerAnalyticsOverview(queryParams);
  const {
    data: financeData,
    isLoading: financeLoading,
    isError: financeIsError,
  } = useGetFarmerFinanceAnalytics(queryParams);
  const {
    data: flockData,
    isLoading: flockLoading,
    isError: flockIsError,
  } = useGetFarmerFlockComparisonAnalytics(queryParams);
  const {
    data: operationsData,
    isLoading: operationsLoading,
    isError: operationsIsError,
  } = useGetFarmerOperationsAnalytics(queryParams);
  const {
    data: productionData,
    isLoading: productionLoading,
    isError: productionIsError,
  } = useGetFarmerProductionAnalytics(queryParams);
  const {
    data: reportData,
    isLoading: reportLoading,
    isError: reportIsError,
  } = useGetFarmerReportAnalytics(queryParams, reportType);

  const overview = data?.data;
  const finance = financeData?.data;
  const flockComparison = flockData?.data;
  const operations = operationsData?.data;
  const production = productionData?.data;
  const report = reportData?.data;
  const batchOptions = overview?.filters.batches || [];
  const summary = overview?.summary;

  useEffect(() => {
    if (batchId === "all") return;
    if (!batchOptions.some((batch) => batch.id === batchId)) {
      setBatchId("all");
    }
  }, [batchId, batchOptions]);

  const netProfitTone =
    (summary?.netProfit || 0) < 0 ? "danger" : ("positive" as const);
  const financeTrend = finance?.trend || [];
  const expenseCategories = finance?.expenseCategories || [];
  const mortalityTrend = operations?.health.mortalityTrend || [];
  const mortalityByReason = operations?.health.mortalityByReason || [];
  const feedTrend = operations?.feed.trend || [];
  const feedByBatch = operations?.feed.byBatch || [];
  const medicineByBatch = operations?.medicine.byBatch || [];
  const eggProductionTrend = production?.productionTrend || [];
  const eggProductionByType = production?.productionByType || [];
  const eggSalesVsProduction = production?.salesVsProduction || [];
  const layerFlockComparison = production?.flockComparison || [];
  const sortedFlockRows = useMemo(() => {
    const rows = [...(flockComparison?.rows || [])];
    rows.sort((a, b) => {
      const first = a[flockSortKey];
      const second = b[flockSortKey];
      const result =
        typeof first === "string" && typeof second === "string"
          ? first.localeCompare(second)
          : Number(first) - Number(second);
      return flockSortDirection === "asc" ? result : -result;
    });
    return rows;
  }, [flockComparison?.rows, flockSortDirection, flockSortKey]);

  const handleFlockSort = (key: FlockSortKey) => {
    if (flockSortKey === key) {
      setFlockSortDirection((direction) =>
        direction === "asc" ? "desc" : "asc"
      );
      return;
    }
    setFlockSortKey(key);
    setFlockSortDirection(key === "batchNumber" ? "asc" : "desc");
  };

  const SortHeader = ({
    label,
    sortKey,
    align = "left",
  }: {
    label: string;
    sortKey: FlockSortKey;
    align?: "left" | "right";
  }) => (
    <Button
      type="button"
      variant="ghost"
      className={`h-auto px-0 py-0 font-semibold hover:bg-transparent ${
        align === "right" ? "ml-auto" : ""
      }`}
      onClick={() => handleFlockSort(sortKey)}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
    </Button>
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Analytics
        </h1>
        <p className="text-sm text-gray-600">
          Owner-level broiler and layer analytics across farms and flocks.
        </p>
      </div>

      <Card className="rounded-lg py-5">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-green-700" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Farm</Label>
              <Select
                value={farmId}
                onValueChange={(value) => {
                  setFarmId(value);
                  setBatchId("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select farm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All farms</SelectItem>
                  {(overview?.filters.farms || []).map((farm) => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Batch Type</Label>
              <Select
                value={batchType}
                onValueChange={(value) => {
                  setBatchType(value);
                  setBatchId("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="BROILER">Broiler</SelectItem>
                  <SelectItem value="LAYERS">Layer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Batch/Flock</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All batches</SelectItem>
                  {batchOptions.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batchNumber} - {batch.farmName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setBatchId("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select
                value={datePreset}
                onValueChange={(value) => setDatePreset(value as DatePreset)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(datePresetLabels) as DatePreset[]).map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {datePresetLabels[preset]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {datePreset === "custom" && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Group By</Label>
              <Select
                value={groupBy}
                onValueChange={(value) =>
                  setGroupBy(value as FarmerAnalyticsGroupBy)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grouping" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(groupByLabels) as FarmerAnalyticsGroupBy[]).map(
                    (option) => (
                      <SelectItem key={option} value={option}>
                        {groupByLabels[option]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load analytics.
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="h-auto min-w-max flex-wrap justify-start gap-1 rounded-lg">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="flock-comparison">Flock Comparison</TabsTrigger>
            <TabsTrigger value="health">Health & Mortality</TabsTrigger>
            <TabsTrigger value="feed-medicine">Feed & Medicine</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total farms"
              value={formatNumber(summary?.totalFarms || 0)}
              helper="Farms in the selected scope"
              icon={Building2}
              isLoading={isLoading}
            />
            <SummaryCard
              title="Active batches"
              value={formatNumber(summary?.activeBatches || 0)}
              helper="Currently running flocks"
              icon={Layers3}
              tone="positive"
              isLoading={isLoading}
            />
            <SummaryCard
              title="Birds"
              value={`${formatNumber(summary?.currentBirds || 0)} / ${formatNumber(
                summary?.totalBirds || 0
              )}`}
              helper="Current birds / total birds"
              icon={BarChart3}
              isLoading={isLoading}
            />
            <SummaryCard
              title="Total revenue"
              value={formatMoney(summary?.totalRevenue || 0)}
              helper="Sales in the selected date range"
              icon={TrendingUp}
              tone="positive"
              isLoading={isLoading}
            />
            <SummaryCard
              title="Total expenses"
              value={formatMoney(summary?.totalExpenses || 0)}
              helper="Expenses in the selected date range"
              icon={Receipt}
              tone="warning"
              isLoading={isLoading}
            />
            <SummaryCard
              title="Net profit"
              value={formatMoney(summary?.netProfit || 0)}
              helper="Revenue minus expenses"
              icon={(summary?.netProfit || 0) < 0 ? TrendingDown : DollarSign}
              tone={netProfitTone}
              isLoading={isLoading}
            />
            <SummaryCard
              title="Money to receive"
              value={formatMoney(summary?.moneyToReceive || 0)}
              helper="Outstanding credit sales"
              icon={CreditCard}
              tone="positive"
              isLoading={isLoading}
            />
            <SummaryCard
              title="Money to pay"
              value={formatMoney(summary?.moneyToPay || 0)}
              helper="Outstanding dealer balance"
              icon={Wallet}
              tone="danger"
              isLoading={isLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          {financeIsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load finance analytics.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Revenue"
              value={formatMoney(finance?.totals.totalRevenue || 0)}
              helper={`${formatNumber(finance?.totals.salesCount || 0)} sales`}
              icon={TrendingUp}
              tone="positive"
              isLoading={financeLoading}
            />
            <SummaryCard
              title="Expenses"
              value={formatMoney(finance?.totals.totalExpenses || 0)}
              helper={`${formatNumber(finance?.totals.expenseCount || 0)} expenses`}
              icon={Receipt}
              tone="warning"
              isLoading={financeLoading}
            />
            <SummaryCard
              title="Profit"
              value={formatMoney(finance?.totals.netProfit || 0)}
              helper="Revenue minus expenses"
              icon={(finance?.totals.netProfit || 0) < 0 ? TrendingDown : DollarSign}
              tone={(finance?.totals.netProfit || 0) < 0 ? "danger" : "positive"}
              isLoading={financeLoading}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-green-700" />
                  Revenue vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {financeLoading ? (
                  <EmptyChartState text="Loading chart..." />
                ) : financeTrend.length === 0 ? (
                  <EmptyChartState text="No finance data for this filter." />
                ) : (
                  <ChartContainer
                    config={financeChartConfig}
                    className="h-[320px] w-full"
                  >
                    <AreaChart data={financeTrend} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => formatCompactMoney(Number(value))}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <div className="flex min-w-[130px] items-center justify-between gap-3">
                                <span className="capitalize text-gray-500">
                                  {String(name)}
                                </span>
                                <span className="font-medium">
                                  {formatMoney(Number(value))}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Area
                        dataKey="revenue"
                        type="monotone"
                        fill="var(--color-revenue)"
                        fillOpacity={0.18}
                        stroke="var(--color-revenue)"
                        strokeWidth={2}
                      />
                      <Area
                        dataKey="expenses"
                        type="monotone"
                        fill="var(--color-expenses)"
                        fillOpacity={0.12}
                        stroke="var(--color-expenses)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-5 w-5 text-amber-700" />
                  Expense Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                {financeLoading ? (
                  <EmptyChartState text="Loading chart..." />
                ) : expenseCategories.length === 0 ? (
                  <EmptyChartState text="No expenses for this filter." />
                ) : (
                  <div className="space-y-4">
                    <ChartContainer
                      config={{ amount: { label: "Amount", color: "#15803d" } }}
                      className="mx-auto h-[240px] w-full"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              hideLabel
                              formatter={(value, name) => (
                                <div className="flex min-w-[150px] items-center justify-between gap-3">
                                  <span className="text-gray-500">
                                    {String(name)}
                                  </span>
                                  <span className="font-medium">
                                    {formatMoney(Number(value))}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Pie
                          data={expenseCategories}
                          dataKey="amount"
                          nameKey="categoryName"
                          innerRadius={56}
                          outerRadius={88}
                          paddingAngle={2}
                        >
                          {expenseCategories.map((category, index) => (
                            <Cell
                              key={category.categoryId}
                              fill={expenseColors[index % expenseColors.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-2">
                      {expenseCategories.slice(0, 6).map((category, index) => (
                        <div
                          key={category.categoryId}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  expenseColors[index % expenseColors.length],
                              }}
                            />
                            <span className="truncate">{category.categoryName}</span>
                          </div>
                          <span className="shrink-0 font-medium">
                            {formatMoney(category.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-blue-700" />
                Profit Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {financeLoading ? (
                <EmptyChartState text="Loading chart..." />
              ) : financeTrend.length === 0 ? (
                <EmptyChartState text="No profit data for this filter." />
              ) : (
                <ChartContainer
                  config={financeChartConfig}
                  className="h-[280px] w-full"
                >
                  <BarChart data={financeTrend} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => formatCompactMoney(Number(value))}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatMoney(Number(value))}
                        />
                      }
                    />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                      {financeTrend.map((row) => (
                        <Cell
                          key={row.period}
                          fill={row.profit < 0 ? "#dc2626" : "#2563eb"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base">
                Finance Table by {groupByLabels[groupBy]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financeLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          Loading finance table...
                        </TableCell>
                      </TableRow>
                    ) : (finance?.table || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No finance rows for this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (finance?.table || []).map((row) => (
                        <TableRow key={row.period}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell className="text-right">
                            {formatMoney(row.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(row.expenses)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              row.profit < 0 ? "text-red-600" : "text-green-700"
                            }`}
                          >
                            {formatMoney(row.profit)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flock-comparison" className="space-y-4">
          {flockIsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load flock comparison.
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-blue-700" />
                  Profit by Batch
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flockLoading ? (
                  <EmptyChartState text="Loading chart..." />
                ) : (flockComparison?.charts.profitByBatch || []).length === 0 ? (
                  <EmptyChartState text="No batch profit data for this filter." />
                ) : (
                  <ChartContainer
                    config={flockChartConfig}
                    className="h-[300px] w-full"
                  >
                    <BarChart
                      data={flockComparison?.charts.profitByBatch || []}
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="batchNumber"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => formatCompactMoney(Number(value))}
                        domain={[
                          (dataMin: number) => Math.min(0, dataMin),
                          (dataMax: number) => Math.max(0, dataMax),
                        ]}
                      />
                      <ReferenceLine y={0} stroke="#9ca3af" />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatMoney(Number(value))}
                          />
                        }
                      />
                      <Bar dataKey="profit" maxBarSize={54} radius={[4, 4, 0, 0]}>
                        {(flockComparison?.charts.profitByBatch || []).map(
                          (row) => (
                            <Cell
                              key={row.batchId}
                              fill={row.profit < 0 ? "#dc2626" : "#2563eb"}
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-5 w-5 text-violet-700" />
                  Cost per Bird by Batch
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flockLoading ? (
                  <EmptyChartState text="Loading chart..." />
                ) : (flockComparison?.charts.costPerBirdByBatch || []).length ===
                  0 ? (
                  <EmptyChartState text="No cost data for this filter." />
                ) : (
                  <ChartContainer
                    config={flockChartConfig}
                    className="h-[300px] w-full"
                  >
                    <BarChart
                      data={flockComparison?.charts.costPerBirdByBatch || []}
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="batchNumber"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => formatCompactMoney(Number(value))}
                        domain={[0, "auto"]}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatMoney(Number(value))}
                          />
                        }
                      />
                      <Bar
                        dataKey="costPerBird"
                        fill="var(--color-costPerBird)"
                        maxBarSize={54}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base">Flock Comparison Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">
                        <SortHeader label="Batch" sortKey="batchNumber" />
                      </TableHead>
                      <TableHead className="min-w-[140px]">Farm</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">
                        <SortHeader label="Age" sortKey="ageDays" align="right" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortHeader
                          label="Initial"
                          sortKey="initialBirds"
                          align="right"
                        />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortHeader
                          label="Current"
                          sortKey="currentBirds"
                          align="right"
                        />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortHeader
                          label="Mortality"
                          sortKey="mortalityRate"
                          align="right"
                        />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortHeader label="Revenue" sortKey="revenue" align="right" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortHeader label="Expense" sortKey="expense" align="right" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortHeader label="Profit" sortKey="profit" align="right" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortHeader
                          label="Cost/Bird"
                          sortKey="costPerBird"
                          align="right"
                        />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortHeader
                          label="Profit/Bird"
                          sortKey="profitPerBird"
                          align="right"
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flockLoading ? (
                      <TableRow>
                        <TableCell colSpan={13} className="h-24 text-center">
                          Loading flock comparison...
                        </TableCell>
                      </TableRow>
                    ) : sortedFlockRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="h-24 text-center">
                          No batches match this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedFlockRows.map((row) => (
                        <TableRow key={row.batchId}>
                          <TableCell className="font-medium">
                            {row.batchNumber}
                          </TableCell>
                          <TableCell>{row.farmName}</TableCell>
                          <TableCell>
                            {row.batchType === "LAYERS" ? "Layer" : "Broiler"}
                          </TableCell>
                          <TableCell>
                            {row.status === "ACTIVE" ? "Active" : "Completed"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.ageDays)} days
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.initialBirds)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.currentBirds)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(row.mortalityRate)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(row.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(row.expense)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              row.profit < 0 ? "text-red-600" : "text-green-700"
                            }`}
                          >
                            {formatMoney(row.profit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(row.costPerBird)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              row.profitPerBird < 0
                                ? "text-red-600"
                                : "text-green-700"
                            }`}
                          >
                            {formatMoney(row.profitPerBird)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="health" className="space-y-4">
          {operationsIsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load health analytics.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Natural deaths"
              value={formatNumber(operations?.health.totals.naturalMortality || 0)}
              helper="Excludes sale and closure reductions"
              icon={HeartPulse}
              tone="danger"
              isLoading={operationsLoading}
            />
            <SummaryCard
              title="Mortality rate"
              value={formatPercent(operations?.health.totals.mortalityRate || 0)}
              helper="Natural deaths / initial birds"
              icon={Activity}
              tone="warning"
              isLoading={operationsLoading}
            />
            <SummaryCard
              title="Birds tracked"
              value={formatNumber(operations?.health.totals.initialBirds || 0)}
              helper="Initial birds in selected flocks"
              icon={BarChart3}
              isLoading={operationsLoading}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HeartPulse className="h-5 w-5 text-red-700" />
                  Mortality Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {operationsLoading ? (
                  <EmptyChartState text="Loading chart..." />
                ) : mortalityTrend.length === 0 ? (
                  <EmptyChartState text="No natural mortality data for this filter." />
                ) : (
                  <ChartContainer
                    config={operationsChartConfig}
                    className="h-[320px] w-full"
                  >
                    <AreaChart data={mortalityTrend} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatNumber(Number(value))}
                          />
                        }
                      />
                      <Area
                        dataKey="naturalDeaths"
                        type="monotone"
                        fill="var(--color-naturalDeaths)"
                        fillOpacity={0.16}
                        stroke="var(--color-naturalDeaths)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-red-700" />
                  Mortality by Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                {operationsLoading ? (
                  <EmptyChartState text="Loading chart..." />
                ) : mortalityByReason.length === 0 ? (
                  <EmptyChartState text="No mortality reasons for this filter." />
                ) : (
                  <div className="space-y-4">
                    <ChartContainer
                      config={{ count: { label: "Count", color: "#dc2626" } }}
                      className="mx-auto h-[220px] w-full"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              hideLabel
                              formatter={(value, name) => (
                                <div className="flex min-w-[150px] items-center justify-between gap-3">
                                  <span className="text-gray-500">
                                    {String(name)}
                                  </span>
                                  <span className="font-medium">
                                    {formatNumber(Number(value))}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Pie
                          data={mortalityByReason}
                          dataKey="count"
                          nameKey="reason"
                          innerRadius={52}
                          outerRadius={82}
                          paddingAngle={2}
                        >
                          {mortalityByReason.map((reason, index) => (
                            <Cell
                              key={reason.reason}
                              fill={expenseColors[index % expenseColors.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-2">
                      {mortalityByReason.slice(0, 6).map((reason, index) => (
                        <div
                          key={reason.reason}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  expenseColors[index % expenseColors.length],
                              }}
                            />
                            <span className="truncate">{reason.reason}</span>
                          </div>
                          <span className="shrink-0 font-medium">
                            {formatNumber(reason.count)} ({formatPercent(reason.percentage)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="feed-medicine" className="space-y-4">
          {operationsIsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load feed and medicine analytics.
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wheat className="h-5 w-5 text-green-700" />
                  Feed Usage Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {operationsLoading ? (
                  <EmptyChartState text="Loading chart..." />
                ) : feedTrend.length === 0 ? (
                  <EmptyChartState text="No feed usage data for this filter." />
                ) : (
                  <ChartContainer
                    config={operationsChartConfig}
                    className="h-[300px] w-full"
                  >
                    <AreaChart data={feedTrend} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatNumber(Number(value))}
                          />
                        }
                      />
                      <Area
                        dataKey="quantity"
                        type="monotone"
                        fill="var(--color-quantity)"
                        fillOpacity={0.16}
                        stroke="var(--color-quantity)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-5 w-5 text-green-700" />
                  Feed Cost by Batch
                </CardTitle>
              </CardHeader>
              <CardContent>
                {operationsLoading ? (
                  <EmptyChartState text="Loading chart..." />
                ) : feedByBatch.filter((row) => row.cost > 0).length === 0 ? (
                  <EmptyChartState text="No feed cost data for this filter." />
                ) : (
                  <ChartContainer
                    config={operationsChartConfig}
                    className="h-[300px] w-full"
                  >
                    <BarChart
                      data={feedByBatch.filter((row) => row.cost > 0)}
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="batchNumber"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => formatCompactMoney(Number(value))}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatMoney(Number(value))}
                          />
                        }
                      />
                      <Bar
                        dataKey="cost"
                        fill="var(--color-quantity)"
                        maxBarSize={54}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="text-base">Feed by Batch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Farm</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {operationsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            Loading feed table...
                          </TableCell>
                        </TableRow>
                      ) : feedByBatch.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No feed rows for this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        feedByBatch.map((row) => (
                          <TableRow key={row.batchId}>
                            <TableCell className="font-medium">
                              {row.batchNumber}
                            </TableCell>
                            <TableCell>{row.farmName}</TableCell>
                            <TableCell className="text-right">
                              {formatNumber(row.quantity)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatMoney(row.cost)}
                            </TableCell>
                            <TableCell className="capitalize">{row.source}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pill className="h-5 w-5 text-violet-700" />
                  Medicine by Batch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Farm</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {operationsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            Loading medicine table...
                          </TableCell>
                        </TableRow>
                      ) : medicineByBatch.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No medicine rows for this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        medicineByBatch.map((row) => (
                          <TableRow key={row.batchId}>
                            <TableCell className="font-medium">
                              {row.batchNumber}
                            </TableCell>
                            <TableCell>{row.farmName}</TableCell>
                            <TableCell className="text-right">
                              {formatNumber(row.quantity)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatMoney(row.cost)}
                            </TableCell>
                            <TableCell className="capitalize">{row.source}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="production" className="space-y-4">
          {productionIsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load production analytics.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard
              title="Total eggs"
              value={formatNumber(production?.totals.totalEggs || 0)}
              helper="Produced in selected layer flocks"
              icon={Egg}
              tone="warning"
              isLoading={productionLoading}
            />
            <SummaryCard
              title="Eggs sold"
              value={formatNumber(production?.totals.eggsSold || 0)}
              helper="Sold from selected layer flocks"
              icon={TrendingUp}
              tone="positive"
              isLoading={productionLoading}
            />
            <SummaryCard
              title="Egg revenue"
              value={formatMoney(production?.totals.eggSalesRevenue || 0)}
              helper="Revenue from egg sales"
              icon={DollarSign}
              tone="positive"
              isLoading={productionLoading}
            />
            <SummaryCard
              title="Egg stock"
              value={formatNumber(production?.totals.eggStock || 0)}
              helper="Current unsold batch stock"
              icon={Layers3}
              isLoading={productionLoading}
            />
            <SummaryCard
              title="Cost per egg"
              value={
                production?.totals.costPerEgg == null
                  ? "Not enough data"
                  : formatMoney(production.totals.costPerEgg)
              }
              helper="Filtered expenses / eggs produced"
              icon={Receipt}
              tone="warning"
              isLoading={productionLoading}
            />
            <SummaryCard
              title="Revenue per egg"
              value={
                production?.totals.revenuePerEgg == null
                  ? "Not enough data"
                  : formatMoney(production.totals.revenuePerEgg)
              }
              helper="Egg revenue / eggs sold"
              icon={CreditCard}
              tone="positive"
              isLoading={productionLoading}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Egg className="h-5 w-5 text-amber-700" />
                  Egg Production Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productionLoading ? (
                  <EmptyChartState text="Loading chart..." />
                ) : eggProductionTrend.length === 0 ? (
                  <EmptyChartState text="No egg production data for this filter." />
                ) : (
                  <ChartContainer
                    config={productionChartConfig}
                    className="h-[320px] w-full"
                  >
                    <AreaChart
                      data={eggProductionTrend}
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatNumber(Number(value))}
                          />
                        }
                      />
                      <Area
                        dataKey="eggsProduced"
                        type="monotone"
                        fill="var(--color-eggsProduced)"
                        fillOpacity={0.16}
                        stroke="var(--color-eggsProduced)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Egg className="h-5 w-5 text-amber-700" />
                  Production by Egg Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productionLoading ? (
                  <EmptyChartState text="Loading chart..." />
                ) : eggProductionByType.length === 0 ? (
                  <EmptyChartState text="No egg type data for this filter." />
                ) : (
                  <div className="space-y-4">
                    <ChartContainer
                      config={{
                        produced: { label: "Produced", color: "#ca8a04" },
                      }}
                      className="mx-auto h-[220px] w-full"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              hideLabel
                              formatter={(value, name) => (
                                <div className="flex min-w-[150px] items-center justify-between gap-3">
                                  <span className="text-gray-500">
                                    {String(name)}
                                  </span>
                                  <span className="font-medium">
                                    {formatNumber(Number(value))}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Pie
                          data={eggProductionByType}
                          dataKey="produced"
                          nameKey="eggTypeName"
                          innerRadius={52}
                          outerRadius={82}
                          paddingAngle={2}
                        >
                          {eggProductionByType.map((type, index) => (
                            <Cell
                              key={type.eggTypeId}
                              fill={expenseColors[index % expenseColors.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-2">
                      {eggProductionByType.slice(0, 6).map((type, index) => (
                        <div
                          key={type.eggTypeId}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  expenseColors[index % expenseColors.length],
                              }}
                            />
                            <span className="truncate">{type.eggTypeName}</span>
                          </div>
                          <span className="shrink-0 font-medium">
                            {formatNumber(type.produced)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-blue-700" />
                Egg Sales vs Production
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productionLoading ? (
                <EmptyChartState text="Loading chart..." />
              ) : eggSalesVsProduction.length === 0 ? (
                <EmptyChartState text="No production or egg sales data for this filter." />
              ) : (
                <ChartContainer
                  config={productionChartConfig}
                  className="h-[300px] w-full"
                >
                  <BarChart
                    data={eggSalesVsProduction}
                    margin={{ left: 8, right: 8 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatNumber(Number(value))}
                        />
                      }
                    />
                    <Bar
                      dataKey="eggsProduced"
                      fill="var(--color-eggsProduced)"
                      maxBarSize={42}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="eggsSold"
                      fill="var(--color-eggsSold)"
                      maxBarSize={42}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base">Layer Flock Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Farm</TableHead>
                      <TableHead className="text-right">Total Eggs</TableHead>
                      <TableHead className="text-right">Eggs/Bird</TableHead>
                      <TableHead className="text-right">Sales Revenue</TableHead>
                      <TableHead className="text-right">Unsold Stock</TableHead>
                      <TableHead className="text-right">Mortality</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          Loading layer flock comparison...
                        </TableCell>
                      </TableRow>
                    ) : layerFlockComparison.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No layer flock data for this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      layerFlockComparison.map((row) => (
                        <TableRow key={row.batchId}>
                          <TableCell className="font-medium">
                            {row.batchNumber}
                          </TableCell>
                          <TableCell>{row.farmName}</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.totalEggs)}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.eggsPerBird == null
                              ? "Not enough data"
                              : row.eggsPerBird.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(row.salesRevenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.unsoldStock)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(row.mortalityRate)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              row.profit < 0 ? "text-red-600" : "text-green-700"
                            }`}
                          >
                            {formatMoney(row.profit)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          {reportIsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load report.
            </div>
          )}

          <Card className="rounded-lg py-5">
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="w-full space-y-2 md:max-w-sm">
                  <Label>Report Type</Label>
                  <Select
                    value={reportType}
                    onValueChange={(value) => setReportType(value as FarmerReportType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select report" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(reportTypeLabels) as FarmerReportType[]).map(
                        (type) => (
                          <SelectItem key={type} value={type}>
                            {reportTypeLabels[type]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!report || reportLoading}
                    onClick={() => report && exportReportCsv(report)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!report || reportLoading}
                    onClick={() => report && exportReportPdf(report)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            {(report?.summary || []).map((item) => (
              <Card key={item.label} className="rounded-lg py-5">
                <CardContent>
                  <p className="text-sm font-medium text-gray-600">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-950">
                    {reportLoading
                      ? "..."
                      : typeof item.value === "number"
                        ? formatReportValue(
                            item.value,
                            item.label.toLowerCase().includes("revenue") ||
                              item.label.toLowerCase().includes("expense") ||
                              item.label.toLowerCase().includes("profit") ||
                              item.label.toLowerCase().includes("due")
                              ? "money"
                              : undefined
                          )
                        : item.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-green-700" />
                {report?.title || reportTypeLabels[reportType]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(report?.columns || []).map((column) => (
                        <TableHead
                          key={column.key}
                          className={
                            column.format === "money" || column.format === "percent"
                              ? "text-right"
                              : undefined
                          }
                        >
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={report?.columns.length || 1}
                          className="h-24 text-center"
                        >
                          Loading report...
                        </TableCell>
                      </TableRow>
                    ) : !report || report.rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={report?.columns.length || 1}
                          className="h-24 text-center"
                        >
                          No rows for this report and filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.rows.map((row, index) => (
                        <TableRow key={index}>
                          {report.columns.map((column) => (
                            <TableCell
                              key={column.key}
                              className={
                                column.format === "money" ||
                                column.format === "percent"
                                  ? "text-right"
                                  : undefined
                              }
                            >
                              {formatReportValue(row[column.key], column.format)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
