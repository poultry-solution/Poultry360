"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  Package,
  Star,
  Truck,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useAuth } from "@/common/store/store";
import { useGetAdminDashboardOverview } from "@/fetchers/admin/dashboardQueries";

const numberFormatter = new Intl.NumberFormat();
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owners",
  MANAGER: "Managers",
  DOCTOR: "Doctors",
  DEALER: "Dealers",
  COMPANY: "Companies",
  HATCHERY: "Hatcheries",
};

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const overviewQuery = useGetAdminDashboardOverview({
    enabled: !isLoading && isAuthenticated && isSuperAdmin,
  });
  const overview = overviewQuery.data?.data;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (user?.role === "DOCTOR") {
      router.push("/doctor/dashboard");
    } else if (user?.role === "OWNER" || user?.role === "MANAGER") {
      router.push("/farmer/dashboard/home");
    } else if (user?.role !== "SUPER_ADMIN") {
      router.push("/auth/login");
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || !isSuperAdmin) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 pt-6">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-36 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (overviewQuery.isError || !overview) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <CardContent className="py-10 text-center">
          <h1 className="text-lg font-semibold">Could not load the dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please try again. No dashboard totals are shown until current data is available.
          </p>
          <Button className="mt-5" variant="outline" onClick={() => overviewQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      title: "Accounts",
      value: formatNumber(overview.accounts.total),
      detail: `+${formatNumber(overview.accounts.newLast30Days)} in last 30 days`,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Active accounts",
      value: formatNumber(overview.accounts.active),
      detail: "Accounts with active status",
      icon: Activity,
      color: "text-emerald-600",
    },
    {
      title: "Farms",
      value: formatNumber(overview.farms.total),
      detail: `+${formatNumber(overview.farms.newLast30Days)} in last 30 days`,
      icon: Building2,
      color: "text-green-600",
    },
    {
      title: "Active batches",
      value: formatNumber(overview.batches.active),
      detail: `${formatNumber(overview.batches.total)} batches in total`,
      icon: Package,
      color: "text-orange-600",
    },
    {
      title: "Birds in active batches",
      value: formatNumber(overview.birds.currentInActiveBatches),
      detail: `${formatNumber(overview.birds.placedInActiveBatches)} placed`,
      icon: BarChart3,
      color: "text-violet-600",
    },
    {
      title: "Pending approvals",
      value: formatNumber(overview.queue.pendingAccountApprovals),
      detail: "Account requests needing review",
      icon: ClipboardCheck,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System overview</h1>
        <p className="text-muted-foreground">
          Live platform totals and the admin work queue. Updated {formatDate(overview.asOf)}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`size-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5 text-blue-600" />
              Account activity
            </CardTitle>
            <CardDescription>Registered customer accounts by role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <OverviewRow label="New registrations today" value={overview.accounts.newToday} />
            <OverviewRow label="Active accounts" value={overview.accounts.active} />
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Account roles
              </p>
              <div className="space-y-2">
                {overview.accounts.byRole.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No customer accounts yet.</p>
                ) : (
                  overview.accounts.byRole.map(({ role, count }) => (
                    <OverviewRow key={role} label={ROLE_LABELS[role] ?? role} value={count} />
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-green-600" />
              Flock overview
            </CardTitle>
            <CardDescription>Current figures across all farm accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <OverviewRow label="Farm capacity" value={`${formatNumber(overview.farms.totalCapacity)} birds`} />
            <OverviewRow label="Birds in active batches" value={overview.birds.currentInActiveBatches} />
            <OverviewRow label="Recorded removals in active batches" value={overview.birds.mortalityInActiveBatches} />
            <OverviewRow label="Completed batches" value={overview.batches.completed} />
            <OverviewRow label="New batches in last 30 days" value={overview.batches.newLast30Days} />
            <p className="pt-1 text-xs text-muted-foreground">
              Current birds are placements less recorded mortality and sale removals.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-amber-600" />
              Admin work queue
            </CardTitle>
            <CardDescription>Items that may need attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <QueueRow href="/admin/dashboard/payment-approvals" label="Pending account approvals" value={overview.queue.pendingAccountApprovals} />
            <QueueRow href="/admin/dashboard/reviews" label="Pending landing reviews" value={overview.queue.pendingReviews} />
            <QueueRow href="/admin/dashboard/enquiries" label="Demo enquiries in last 30 days" value={overview.queue.demoEnquiriesLast30Days} />
            <OverviewRow label="Contact requests in last 30 days" value={overview.queue.contactRequestsLast30Days} />
            <QueueRow href="/admin/dashboard/activity" label="Recorded activity in last 24 hours" value={overview.queue.activityLast24Hours} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Latest accounts</CardTitle>
              <CardDescription>Most recently registered customer accounts</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/dashboard/users">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {overview.recentAccounts.length === 0 ? (
              <EmptyState message="No customer accounts yet." />
            ) : (
              <div className="divide-y">
                {overview.recentAccounts.map((account) => (
                  <Link
                    key={account.id}
                    href={`/admin/dashboard/users/${account.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-primary"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{account.companyName || account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.name} · {ROLE_LABELS[account.role] ?? account.role}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">{formatDate(account.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Latest platform activity</CardTitle>
              <CardDescription>Most recently recorded business and admin actions</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/dashboard/activity">View activity</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {overview.recentActivity.length === 0 ? (
              <EmptyState message="No activity has been recorded yet." />
            ) : (
              <div className="divide-y">
                {overview.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{activity.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {activity.actorName}
                        {activity.actorRole ? ` · ${activity.actorRole}` : ""}
                        {activity.targetType ? ` · ${activity.targetType}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">{formatDate(activity.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <QuickLink href="/admin/dashboard/users" icon={Users} title="User management" description="Review accounts, features, usage, and flock records." />
        <QuickLink href="/admin/dashboard/payment-approvals" icon={ClipboardCheck} title="Payment approvals" description="Approve or reject new account requests." />
        <QuickLink href="/admin/dashboard/enquiries" icon={Truck} title="Demo enquiries" description="Follow up on business demo requests." />
        <QuickLink href="/admin/dashboard/reviews" icon={Star} title="Landing reviews" description="Moderate customer reviews for the public site." />
        <QuickLink href="/admin/dashboard/activity" icon={Activity} title="Activity" description="Review platform business and admin history." />
        <QuickLink href="/admin/dashboard/blog" icon={FileText} title="Blog" description="Manage public articles and announcements." />
      </div>
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="shrink-0 font-semibold">{typeof value === "number" ? formatNumber(value) : value}</span>
    </div>
  );
}

function QueueRow({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-4 text-sm hover:text-primary">
      <span className="text-muted-foreground">{label}</span>
      <span className="shrink-0 font-semibold">{formatNumber(value)}</span>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>;
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="size-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
