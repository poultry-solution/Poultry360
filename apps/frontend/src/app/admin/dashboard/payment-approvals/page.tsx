"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from "@/common/components/ui/badge";
import { toast } from "sonner";
import {
  useApproveAccount,
  useGetAdminAccountApprovals,
  useRejectAccount,
  type AccountApprovalState,
  type AdminAccountApprovalsFilters,
} from "@/fetchers/admin/adminPaymentApprovalsQueries";

const STATUS_OPTIONS: Array<{ value: AccountApprovalState; label: string }> = [
  { value: "PENDING_PAYMENT", label: "Pending approval" },
  { value: "PAYMENT_APPROVED", label: "Approved" },
  { value: "PAYMENT_REJECTED", label: "Rejected" },
];

const ROLE_OPTIONS: Array<{
  value: NonNullable<AdminAccountApprovalsFilters["role"]>;
  label: string;
}> = [
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "DEALER", label: "Dealer" },
  { value: "COMPANY", label: "Company" },
  { value: "HATCHERY", label: "Hatchery" },
  { value: "DOCTOR", label: "Doctor" },
];

function statusBadge(state: AccountApprovalState) {
  switch (state) {
    case "PENDING_PAYMENT":
      return <Badge variant="secondary">Pending</Badge>;
    case "PAYMENT_APPROVED":
      return (
        <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200">
          Approved
        </Badge>
      );
    case "PAYMENT_REJECTED":
      return (
        <Badge className="bg-rose-50 text-rose-800 border border-rose-200">
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline">{state}</Badge>;
  }
}

export default function AccountApprovalsPage() {
  const [filters, setFilters] = useState<AdminAccountApprovalsFilters>({
    page: 1,
    limit: 20,
    status: "PENDING_PAYMENT",
    role: undefined,
    search: "",
  });

  const { data, isLoading, refetch } = useGetAdminAccountApprovals(filters);
  const approveMutation = useApproveAccount();
  const rejectMutation = useRejectAccount();

  const rows = data?.data ?? [];

  const onApprove = async (userId: string) => {
    try {
      await approveMutation.mutateAsync(userId);
      toast.success("Account approved");
      await refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to approve");
    }
  };

  const onReject = async (userId: string) => {
    const reason = window.prompt("Rejection reason (required)");
    if (!reason || !reason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    try {
      await rejectMutation.mutateAsync({ userId, rejectionReason: reason.trim() });
      toast.success("Account rejected");
      await refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to reject");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Account approval queue</CardTitle>
          <CardDescription>
            Review new signups and approve or reject account access. Pricing is
            handled offline with each customer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(v) =>
                  setFilters((prev) => ({ ...prev, status: v as AccountApprovalState }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={filters.role ?? "ALL"}
                onValueChange={(v) =>
                  setFilters((prev) => ({
                    ...prev,
                    role: v === "ALL" ? undefined : (v as any),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All roles</SelectItem>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Search</label>
              <Input
                value={filters.search ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Name / phone (min 2 chars)"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signups</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading..."
              : data?.pagination
                ? `Showing ${rows.length} results (page ${data.pagination.page})`
                : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell>
                      <div className="font-medium">{row.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.phone}
                      </div>
                      {row.rejectionReason && row.state === "PAYMENT_REJECTED" && (
                        <div className="text-xs text-rose-600 mt-1">
                          {row.rejectionReason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{row.role}</TableCell>
                    <TableCell>
                      {row.companyName || (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(row.state)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onApprove(row.userId)}
                          disabled={
                            row.state === "PAYMENT_APPROVED" ||
                            approveMutation.isPending
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => onReject(row.userId)}
                          disabled={
                            row.state === "PAYMENT_REJECTED" ||
                            rejectMutation.isPending
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
