"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/common/components/ui/card";
import { Egg, Building2, TrendingUp, Clock } from "lucide-react";
import { useAuthStore } from "@/common/store/store";
import { useI18n } from "@/i18n/useI18n";

export default function HatcheryHomePage() {
  const { user } = useAuthStore();
  const { t } = useI18n();

  const hatcheryName = user?.hatchery?.name ?? user?.name ?? "Your Hatchery";

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 p-6">
        <div className="flex items-center gap-3 mb-1">
          <Egg className="w-7 h-7 text-orange-500" />
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.name}
          </h1>
        </div>
        <p className="text-muted-foreground ml-10">
          {hatcheryName} &mdash; Hatchery Management Dashboard
        </p>
      </div>

      {/* Coming soon stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-dashed border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Egg Inventory
            </CardTitle>
            <Egg className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-muted-foreground/60">
              Coming soon
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Track your egg stock levels
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hatch Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-muted-foreground/60">
              Coming soon
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Monitor hatch performance
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Batches
            </CardTitle>
            <Building2 className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-muted-foreground/60">
              Coming soon
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Manage incubation cycles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roadmap card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <CardTitle>Hatchery Module &mdash; Coming Soon</CardTitle>
          </div>
          <CardDescription>
            We are building a full end-to-end hatchery management system for
            you. Features in the pipeline:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Egg collection &amp; inventory tracking</li>
            <li>Incubation batch management with automated timers</li>
            <li>Hatch rate analytics and mortality reports</li>
            <li>Chick sale orders and customer ledger</li>
            <li>Supplier &amp; breed management</li>
            <li>Revenue and expense tracking</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
