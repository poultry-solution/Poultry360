"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Tractor,
  MessageCircle,
  Eye,
} from "lucide-react";
import {
  useGetAdminUsers,
  type AdminUser,
  type AdminUserFilters,
} from "@/fetchers/admin/userQueries";

const ROLE_OPTIONS = [
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "DEALER", label: "Dealer" },
  { value: "COMPANY", label: "Company" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PENDING_VERIFICATION", label: "Pending" },
];

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-blue-100 text-blue-800",
  MANAGER: "bg-purple-100 text-purple-800",
  DOCTOR: "bg-green-100 text-green-800",
  DEALER: "bg-orange-100 text-orange-800",
  COMPANY: "bg-indigo-100 text-indigo-800",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-red-100 text-red-800",
  PENDING_VERIFICATION: "bg-yellow-100 text-yellow-800",
};

function ConnectionChip({
  icon: Icon,
  count,
  label,
  color,
  names,
}: {
  icon: typeof Users;
  count: number;
  label: string;
  color: string;
  names?: string[];
}) {
  const maxShow = 3;
  const tooltipText =
    names && names.length > 0
      ? count > maxShow
        ? `${names.slice(0, maxShow).join(", ")} +${count - maxShow} more`
        : names.slice(0, maxShow).join(", ")
      : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-default ${color} ${tooltipText ? "relative group" : ""}`}
    >
      <Icon className="size-3.5" />
      {count} {label}
      {tooltipText && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-xs font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {tooltipText}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

function ConnectionsBadges({ user }: { user: AdminUser }) {
  const chips: React.ReactNode[] = [];

  switch (user.role) {
    case "OWNER":
    case "MANAGER": {
      const farmCount = user._count.ownedFarms + user._count.managedFarms;
      if (farmCount > 0) {
        chips.push(
          <ConnectionChip
            key="farms"
            icon={Tractor}
            count={farmCount}
            label={farmCount !== 1 ? "Farms" : "Farm"}
            color="bg-emerald-50 text-emerald-700 border border-emerald-200"
            names={[
              ...user.ownedFarms.map((f) => f.name),
              ...user.managedFarms.map((f) => f.name),
            ]}
          />
        );
      }
      if (user._count.dealerConnections > 0) {
        chips.push(
          <ConnectionChip
            key="dealers"
            icon={Users}
            count={user._count.dealerConnections}
            label={user._count.dealerConnections !== 1 ? "Dealers" : "Dealer"}
            color="bg-orange-50 text-orange-700 border border-orange-200"
            names={user.dealerConnections.map((c) => c.dealer.name)}
          />
        );
      }
      break;
    }
    case "DEALER": {
      if (user.dealer) {
        const companyCount = user.dealer._count.companies;
        const farmerCount = user.dealer._count.farmerConnections;
        if (companyCount > 0) {
          chips.push(
            <ConnectionChip
              key="companies"
              icon={Building2}
              count={companyCount}
              label={companyCount !== 1 ? "Companies" : "Company"}
              color="bg-indigo-50 text-indigo-700 border border-indigo-200"
              names={user.dealer.companies.map((c) => c.company.name)}
            />
          );
        }
        if (farmerCount > 0) {
          chips.push(
            <ConnectionChip
              key="farmers"
              icon={Tractor}
              count={farmerCount}
              label={farmerCount !== 1 ? "Farmers" : "Farmer"}
              color="bg-emerald-50 text-emerald-700 border border-emerald-200"
              names={user.dealer.farmerConnections.map((c) => c.farmer.name)}
            />
          );
        }
      }
      break;
    }
    case "COMPANY": {
      if (user.company) {
        const dealerCount = user.company._count.dealerCompanies;
        if (dealerCount > 0) {
          chips.push(
            <ConnectionChip
              key="dealers"
              icon={Users}
              count={dealerCount}
              label={dealerCount !== 1 ? "Dealers" : "Dealer"}
              color="bg-orange-50 text-orange-700 border border-orange-200"
              names={user.company.dealerCompanies.map((c) => c.dealer.name)}
            />
          );
        }
      }
      break;
    }
    case "DOCTOR": {
      const convCount = user._count.doctorConversations;
      if (convCount > 0) {
        chips.push(
          <ConnectionChip
            key="conversations"
            icon={MessageCircle}
            count={convCount}
            label={convCount !== 1 ? "Patients" : "Patient"}
            color="bg-sky-50 text-sky-700 border border-sky-200"
          />
        );
      }
      break;
    }
  }

  if (chips.length === 0) {
    return (
      <span className="text-xs italic text-muted-foreground">
        No connections
      </span>
    );
  }

  return <div className="flex flex-wrap gap-1.5">{chips}</div>;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter]);

  const filters: AdminUserFilters = {
    page,
    limit: 15,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(roleFilter && { role: roleFilter as AdminUserFilters["role"] }),
    ...(statusFilter && {
      status: statusFilter as AdminUserFilters["status"],
    }),
  };

  const { data, isLoading, isError, refetch } = useGetAdminUsers(filters);

  const users = data?.data ?? [];
  const pagination = data?.pagination;
  const hasFilters = !!debouncedSearch || !!roleFilter || !!statusFilter;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setRoleFilter(undefined);
    setStatusFilter(undefined);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          View all registered users and their connections
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={roleFilter ?? ""}
                onValueChange={(v) => setRoleFilter(v || undefined)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter ?? ""}
                onValueChange={(v) => setStatusFilter(v || undefined)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 size-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {pagination
                ? `Showing ${users.length} of ${pagination.total} users`
                : "Users"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-md border p-3"
                >
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Failed to load users</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="size-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No users found</p>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connections</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        {user.CompanyFarmLocation && (
                          <p className="text-xs text-muted-foreground">
                            {user.CompanyFarmLocation}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.phone}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[user.role] ?? ""}`}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[user.status] ?? ""}`}
                      >
                        {user.status === "PENDING_VERIFICATION"
                          ? "PENDING"
                          : user.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ConnectionsBadges user={user} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/dashboard/users/${user.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-1 size-4" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
