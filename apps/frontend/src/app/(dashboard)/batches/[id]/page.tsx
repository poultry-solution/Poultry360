"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, ArrowLeft } from "lucide-react";

interface BatchDetail {
  id: number;
  code: string;
  farm: string;
  startDate: string; // ISO yyyy-mm-dd
  status: "Active" | "Closed";
  initialBirds: number;
}

const MOCK_BATCHES: BatchDetail[] = [
  { id: 1, code: "B-2024-001", farm: "Farm A", startDate: "2024-01-15", status: "Active", initialBirds: 2500 },
  { id: 2, code: "B-2024-002", farm: "Farm B", startDate: "2024-01-20", status: "Active", initialBirds: 2000 },
];

const TABS = ["Overview", "Expenses", "Sales", "Sales Balance", "Profit & Loss"] as const;

function formatDateYYYYMMDD(dateStr: string): string {
  // Force UTC and stable output dd/mm/yyyy
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { timeZone: "UTC" });
}

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = Number(params?.id);
  const batch = useMemo(() => MOCK_BATCHES.find(b => b.id === batchId), [batchId]);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");

  if (!batch) return notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/batches" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> {batch.code}
          </h1>
          <Badge variant="outline" className={batch.status === "Active" ? "text-green-600 border-green-600/30" : ""}>{batch.status}</Badge>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Farm</div>
          <div className="font-medium">{batch.farm}</div>
        </div>
      </div>

      {/* Meta */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Start Date</CardTitle>
            <CardDescription>{formatDateYYYYMMDD(batch.startDate)}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Initial Birds</CardTitle>
            <CardDescription>{batch.initialBirds.toLocaleString()}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Age</CardTitle>
            <CardDescription>— days</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex flex-wrap gap-2">
          {TABS.map(tab => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              className={activeTab === tab ? "bg-primary text-primary-foreground" : "hover:border-primary hover:text-primary"}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "Overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Key Stats</CardTitle>
              <CardDescription>Snapshot of current performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Mortality</div>
                  <div className="font-medium">— %</div>
                </div>
                <div>
                  <div className="text-muted-foreground">FCR</div>
                  <div className="font-medium">—</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Feed Used</div>
                  <div className="font-medium">— kg</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Medicine Cost</div>
                  <div className="font-medium">—</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates for this batch</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full" /> Expense added: Feed purchase</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full" /> Sales recorded: 120 birds</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full" /> Medicine issued: Vitamin D3</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Expenses" && (
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>All expense entries for this batch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-left py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">{formatDateYYYYMMDD("2024-02-10")}</td>
                    <td className="py-2">Feed</td>
                    <td className="py-2 text-right">₹45,000</td>
                    <td className="py-2">Broiler starter feed</td>
                  </tr>
                  <tr>
                    <td className="py-2">{formatDateYYYYMMDD("2024-02-12")}</td>
                    <td className="py-2">Medicine</td>
                    <td className="py-2 text-right">₹6,500</td>
                    <td className="py-2">Vitamin supplements</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Sales" && (
        <Card>
          <CardHeader>
            <CardTitle>Sales</CardTitle>
            <CardDescription>Recorded sales for this batch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-right py-2">Qty (birds)</th>
                    <th className="text-right py-2">Rate</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">{formatDateYYYYMMDD("2024-03-01")}</td>
                    <td className="py-2 text-right">120</td>
                    <td className="py-2 text-right">₹240</td>
                    <td className="py-2 text-right">₹28,800</td>
                  </tr>
                  <tr>
                    <td className="py-2">{formatDateYYYYMMDD("2024-03-05")}</td>
                    <td className="py-2 text-right">90</td>
                    <td className="py-2 text-right">₹235</td>
                    <td className="py-2 text-right">₹21,150</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Sales Balance" && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Ledger</CardTitle>
            <CardDescription>Balances with customers for this batch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-2">Customer</th>
                    <th className="text-right py-2">Sales</th>
                    <th className="text-right py-2">Received</th>
                    <th className="text-right py-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Sharma Traders</td>
                    <td className="py-2 text-right">₹50,000</td>
                    <td className="py-2 text-right">₹30,000</td>
                    <td className="py-2 text-right">₹20,000</td>
                  </tr>
                  <tr>
                    <td className="py-2">KTM Fresh</td>
                    <td className="py-2 text-right">₹38,000</td>
                    <td className="py-2 text-right">₹38,000</td>
                    <td className="py-2 text-right">₹0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Profit & Loss" && (
        <Card>
          <CardHeader>
            <CardTitle>Profit & Loss</CardTitle>
            <CardDescription>Summary for this batch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium">₹86,000</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Feed</span><span className="font-medium">₹45,000</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Medicine</span><span className="font-medium">₹6,500</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Other</span><span className="font-medium">₹4,000</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Cost</span><span className="font-medium">₹55,500</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Net Profit</span><span className="font-medium text-green-600">₹30,500</span></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
