"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, Leaf, Syringe, TrendingDown, DollarSign } from "lucide-react";
import { useGetBatchShareByToken } from "@/fetchers/batchShare/batchShareQueries";

type SnapshotResponse = {
  share: {
    id: string;
    title?: string | null;
    description?: string | null;
    createdAt: string;
    expiresAt?: string | null;
    viewCount: number;
    snapshotData: any;
  };
  canAddNotes: boolean;
};

export default function SharedBatchPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token as string;
  const { data, isLoading, error } = useGetBatchShareByToken(token);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading shared batch report...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2 font-medium">Failed to load report</p>
          <p className="text-sm text-muted-foreground">{(error && (typeof error === "string" ? error : (error as any)?.message)) || "Share not found or expired."}</p>
        </div>
      </div>
    );
  }

  const snap = data.share?.snapshotData || {};
  const batch = snap.batch || {};
  const farm = snap.farm || {};
  const feed = snap.feed || {};
  const health = snap.health || {};
  const financials = snap.financials || {};

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Batch Report {batch.batchNumber ? `- ${batch.batchNumber}` : ""}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {farm?.name ? `${farm.name} • ` : ""}
            {batch?.status} • {batch?.currentChicks ?? 0}/{batch?.initialChicks ?? 0} birds
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>Shared on {new Date(data.share.createdAt).toLocaleString()}</div>
          {data.share.expiresAt && (
            <div>Expires {new Date(data.share.expiresAt).toLocaleString()}</div>
          )}
          <div>Views: {data.share.viewCount}</div>
        </div>
      </div>

      {data.share.title && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{data.share.title}</CardTitle>
          </CardHeader>
          {data.share.description && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{data.share.description}</p>
            </CardContent>
          )}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feed Used</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(feed.totalConsumption || 0).toLocaleString()} kg</div>
            <p className="text-xs text-muted-foreground">Total feed consumption</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mortality Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(health.mortalityRate || 0).toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Total mortality: {Number(health.totalMortality || 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vaccinations</CardTitle>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(health.vaccinations) ? health.vaccinations.length : 0}</div>
            <p className="text-xs text-muted-foreground">Completed or scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{Number(financials.netProfit || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Revenue ₹{Number(financials.totalRevenue || 0).toLocaleString()} • Expenses ₹{Number(financials.totalExpenses || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Batch</div>
              <div className="font-medium">{batch.batchNumber}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Farm</div>
              <div className="font-medium">{farm.name}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Start Date</div>
              <div className="font-medium">{batch.startDate ? new Date(batch.startDate).toLocaleDateString() : "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">End Date</div>
              <div className="font-medium">{batch.endDate ? new Date(batch.endDate).toLocaleDateString() : "Active"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className="font-medium">{batch.status}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Birds</div>
              <div className="font-medium">{Number(batch.currentChicks || 0).toLocaleString()} / {Number(batch.initialChicks || 0).toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


