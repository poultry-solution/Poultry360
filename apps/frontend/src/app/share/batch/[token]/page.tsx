"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, Leaf, Syringe, TrendingDown, Calendar, Eye, Clock, MapPin, Bird } from "lucide-react";
import { useGetBatchShareByToken } from "@/fetchers/batchShare/batchShareQueries";
import { DateDisplay } from "@/components/ui/date-display";

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">Loading shared batch report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="max-w-md mx-4 border-destructive/50">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-destructive mb-2 font-semibold text-lg">Failed to Load Report</p>
            <p className="text-sm text-muted-foreground">
              {(error && (typeof error === "string" ? error : (error as any)?.message)) || "Share not found or expired."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snap = data.share?.snapshotData || {};
  const batch = snap.batch || {};
  const farm = snap.farm || {};
  const feed = snap.feed || {};
  const health = snap.health || {};
  const activities = snap.activities || {};


  const totalFeedKg = (() => {
    const direct = Number(feed.totalConsumption);
    if (Number.isFinite(direct) && direct > 0) return direct;
    if (Array.isArray(feed.timeline)) {
      return feed.timeline.reduce(
        (sum: number, it: any) => sum + Number(it?.quantity || 0),
        0
      );
    }
    return 0;
  })();

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'active') return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    if (s === 'completed') return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-7xl">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/10 backdrop-blur-sm">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center backdrop-blur-sm">
                    <Bird className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                      {batch.batchNumber ? `Batch ${batch.batchNumber}` : "Batch Report"}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {farm?.name && (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {farm.name}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(batch?.status)}`}>
                        {batch?.status || 'Unknown'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Bird className="h-3.5 w-3.5" />
                        {batch?.currentChicks ?? 0} / {batch?.initialChicks ?? 0} birds
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Card className="md:min-w-[240px] bg-background/50 backdrop-blur-sm border-muted">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Shared: <DateDisplay date={data.share.createdAt} format="long" /></span>
                  </div>
                  {data.share.expiresAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Expires: <DateDisplay date={data.share.expiresAt} format="long" /></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span>{data.share.viewCount} views</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Title & Description Card */}
        {data.share.title && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{data.share.title}</CardTitle>
            </CardHeader>
            {data.share.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{data.share.description}</p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Feed Consumption</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Leaf className="h-5 w-5 text-green-600 dark:text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{Number(totalFeedKg || 0).toLocaleString()} kg</div>
              <p className="text-xs text-muted-foreground mt-2">Total feed used</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Mortality Rate</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{Number(health.mortalityRate || 0).toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground mt-2">{Number(health.totalMortality || 0).toLocaleString()} total deaths</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Vaccinations</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Syringe className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{Array.isArray(health.vaccinations) ? health.vaccinations.length : 0}</div>
              <p className="text-xs text-muted-foreground mt-2">Completed or scheduled</p>
            </CardContent>
          </Card>
        </div>

        {/* Overview Card */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Batch Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Batch Number</div>
                <div className="text-base font-semibold">{batch.batchNumber || "-"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Farm Location</div>
                <div className="text-base font-semibold">{farm.name || "-"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Status</div>
                <div className="text-base font-semibold">{batch.status || "-"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</div>
                <div className="text-base font-semibold">{batch.startDate ? <DateDisplay date={batch.startDate} format="short" /> : "-"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</div>
                <div className="text-base font-semibold">{batch.endDate ? <DateDisplay date={batch.endDate} format="short" /> : "Active"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bird Count</div>
                <div className="text-base font-semibold">{Number(batch.currentChicks || 0).toLocaleString()} / {Number(batch.initialChicks || 0).toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities */}
         {Array.isArray(activities.expensesGrouped) && activities.expensesGrouped.length > 0 && (
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {activities.expensesGrouped.map((group: any, idx: number) => (
                <div key={idx} className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-semibold text-sm">{group.category}</span>
                  </div>
                   <div className="overflow-hidden rounded-xl border border-border/50">
                     <table className="w-full">
                       <thead>
                         <tr className="bg-muted/50 border-b border-border/50">
                           <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                           <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</th>
                           <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-border/30">
                         {group.items.map((it: any, j: number) => (
                           <tr key={j} className="hover:bg-muted/30 transition-colors">
                             <td className="px-4 py-3 whitespace-nowrap text-sm font-medium"><DateDisplay date={it.date} format="short" /></td>
                             <td className="px-4 py-3 text-right text-sm font-semibold">
                               {it.quantity !== null && it.quantity !== undefined
                                 ? `${Number(it.quantity).toLocaleString()}${it.unit ? ` ${it.unit}` : ""}`
                                 : "-"}
                             </td>
                             <td className="px-4 py-3 text-sm text-muted-foreground">{it.itemName || "-"}</td>
                           </tr>
                         ))}
                       </tbody>
                       {group.category?.toLowerCase().includes("feed") && (
                         <tfoot className="border-t-2 bg-muted/30">
                           <tr>
                             <td className="px-4 py-3 text-sm font-semibold">Total</td>
                             <td className="px-4 py-3 text-right text-sm font-bold">
                               {group.items
                                 .reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0)
                                 .toLocaleString()} kg
                             </td>
                             <td className="px-4 py-3"></td>
                           </tr>
                         </tfoot>
                       )}
                     </table>
                   </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Feed Timeline */}
        {Array.isArray(feed.timeline) && feed.timeline.length > 0 && (
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                Feed Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-border/50">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity (kg)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feed Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {[...feed.timeline]
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((f: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium"><DateDisplay date={f.date} format="short" /></td>
                          <td className="px-4 py-3 text-right text-sm font-semibold">{Number(f.quantity || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{f.feedType}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="border-t-2 bg-muted/30">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold">Total</td>
                      <td className="px-4 py-3 text-right text-sm font-bold">{Number(totalFeedKg || 0).toLocaleString()}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mortality Table */}
        {Array.isArray(health.mortalityTimeline) && health.mortalityTimeline.length > 0 && (
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                Mortality Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-border/50">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deaths</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {[...health.mortalityTimeline]
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((m: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium"><DateDisplay date={m.date} format="short" /></td>
                          <td className="px-4 py-3 text-right text-sm font-semibold">{Number(m.count || 0)}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">{Number(m.cumulative || 0)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}