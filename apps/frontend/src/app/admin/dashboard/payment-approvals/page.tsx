"use client";

import { useMemo, useState } from "react";
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
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { Badge } from "@/common/components/ui/badge";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { toast } from "sonner";
import {
  useApprovePaymentSubmission,
  useGetAdminPaymentApprovals,
  useRejectPaymentSubmission,
  type AdminPaymentApprovalsFilters,
  type PaymentSubmissionStatus,
} from "@/fetchers/admin/adminPaymentApprovalsQueries";
import {
  useGetAdminOnboardingPaymentSettings,
  useUpdateAdminOnboardingPaymentSettings,
} from "@/fetchers/admin/adminOnboardingPaymentSettingsQueries";

const STATUS_OPTIONS: Array<{ value: PaymentSubmissionStatus; label: string }> =
  [
    { value: "PENDING_REVIEW", label: "Pending review" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
  ];

const ROLE_OPTIONS: Array<{
  value: AdminPaymentApprovalsFilters["role"];
  label: string;
}> = [
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "DEALER", label: "Dealer" },
  { value: "COMPANY", label: "Company" },
  { value: "DOCTOR", label: "Doctor" },
];

function statusBadge(status: PaymentSubmissionStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return <Badge variant="secondary">{status}</Badge>;
    case "APPROVED":
      return (
        <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200">
          {status}
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-rose-50 text-rose-800 border border-rose-200">
          {status}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function PaymentApprovalsPage() {
  const [filters, setFilters] = useState<AdminPaymentApprovalsFilters>({
    page: 1,
    limit: 20,
    status: "PENDING_REVIEW",
    role: undefined,
    search: "",
  });

  const { data, isLoading, refetch } = useGetAdminPaymentApprovals(filters);
  const { data: settingsData } = useGetAdminOnboardingPaymentSettings();
  const approveMutation = useApprovePaymentSubmission();
  const rejectMutation = useRejectPaymentSubmission();
  const updateSettingsMutation = useUpdateAdminOnboardingPaymentSettings();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ownerAmountNpr, setOwnerAmountNpr] = useState("6999");
  const [managerAmountNpr, setManagerAmountNpr] = useState("6999");
  const [dealerAmountNpr, setDealerAmountNpr] = useState("7875");
  const [companyAmountNpr, setCompanyAmountNpr] = useState("30000");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrText, setQrText] = useState("Poultry360 Onboarding Payment");
  const [phoneDisplay, setPhoneDisplay] = useState("+977 9809781908");
  const [accountHint, setAccountHint] = useState(
    "Pay the onboarding fee to activate your account."
  );

  const rows = data?.data ?? [];

  const syncSettingsForm = () => {
    const current = settingsData?.data;
    if (!current) return;
    setOwnerAmountNpr(String(current.ownerAmountNpr));
    setManagerAmountNpr(String(current.managerAmountNpr));
    setDealerAmountNpr(String(current.dealerAmountNpr));
    setCompanyAmountNpr(String(current.companyAmountNpr));
    setQrImageUrl(current.qrImageUrl || "");
    setQrText(current.qrText || "Poultry360 Onboarding Payment");
    setPhoneDisplay(current.phoneDisplay || "+977 9809781908");
    setAccountHint(
      current.accountHint || "Pay the onboarding fee to activate your account."
    );
  };

  const canAct = useMemo(() => {
    return (status: PaymentSubmissionStatus) => status === "PENDING_REVIEW";
  }, []);

  const onApprove = async (submissionId: string) => {
    try {
      await approveMutation.mutateAsync(submissionId);
      toast.success("Approved successfully");
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || "Failed to approve");
    }
  };

  const onReject = async (submissionId: string) => {
    const reason = window.prompt("Rejection reason (required)");
    if (!reason || !reason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        submissionId,
        rejectionReason: reason.trim(),
      });
      toast.success("Rejected successfully");
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || "Failed to reject");
    }
  };

  const onSaveSettings = async () => {
    const owner = Number(ownerAmountNpr);
    const manager = Number(managerAmountNpr);
    const dealer = Number(dealerAmountNpr);
    const company = Number(companyAmountNpr);

    if (
      !Number.isFinite(owner) ||
      !Number.isFinite(manager) ||
      !Number.isFinite(dealer) ||
      !Number.isFinite(company)
    ) {
      toast.error("All prices must be valid numbers.");
      return;
    }

    if (owner < 0 || manager < 0 || dealer < 0 || company < 0) {
      toast.error("Prices cannot be negative.");
      return;
    }

    if (!qrImageUrl.trim()) {
      toast.error("Please upload a QR image.");
      return;
    }

    if (!phoneDisplay.trim() || !accountHint.trim()) {
      toast.error("Phone and account hint are required.");
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        ownerAmountNpr: owner,
        managerAmountNpr: manager,
        dealerAmountNpr: dealer,
        companyAmountNpr: company,
        qrImageUrl: qrImageUrl.trim(),
        qrText: qrText.trim() || "Poultry360 Onboarding Payment",
        phoneDisplay: phoneDisplay.trim(),
        accountHint: accountHint.trim(),
      });
      toast.success("Pricing and payment info updated.");
      setIsSettingsOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update settings.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment approval queue</CardTitle>
          <CardDescription>
            Review onboarding payments and approve/reject submissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(v) =>
                  setFilters((prev) => ({ ...prev, status: v as any }))
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
                    <SelectItem
                      key={String(opt.value)}
                      value={String(opt.value)}
                    >
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
                  setFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                placeholder="Name / phone (min 2 chars)"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                Refresh
              </Button>
              <Dialog
                open={isSettingsOpen}
                onOpenChange={(open) => {
                  setIsSettingsOpen(open);
                  if (open) syncSettingsForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button type="button" variant="default">
                    Change pricing and info
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Change pricing and info</DialogTitle>
                    <DialogDescription>
                      Update onboarding prices by role and payment QR details.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Owner price (NPR)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={ownerAmountNpr}
                        onChange={(e) => setOwnerAmountNpr(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Manager price (NPR)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={managerAmountNpr}
                        onChange={(e) => setManagerAmountNpr(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Dealer price (NPR)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={dealerAmountNpr}
                        onChange={(e) => setDealerAmountNpr(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Company price (NPR)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={companyAmountNpr}
                        onChange={(e) => setCompanyAmountNpr(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>QR image</Label>
                    <ImageUpload
                      value={qrImageUrl}
                      onChange={setQrImageUrl}
                      folder="onboarding-payments"
                      placeholder="Upload onboarding QR image"
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>QR text</Label>
                    <Input
                      value={qrText}
                      onChange={(e) => setQrText(e.target.value)}
                      placeholder="Poultry360 Onboarding Payment"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Phone display</Label>
                    <Input
                      value={phoneDisplay}
                      onChange={(e) => setPhoneDisplay(e.target.value)}
                      placeholder="+977 9809781908"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Account hint</Label>
                    <Textarea
                      rows={3}
                      value={accountHint}
                      onChange={(e) => setAccountHint(e.target.value)}
                      placeholder="Pay the onboarding fee to activate your account."
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSettingsOpen(false)}
                      disabled={updateSettingsMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={onSaveSettings}
                      disabled={updateSettingsMutation.isPending}
                    >
                      {updateSettingsMutation.isPending ? "Saving..." : "Save changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions</CardTitle>
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
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No submissions found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.phone}
                      </div>
                      {row.rejectionReason && row.status === "REJECTED" && (
                        <div className="text-xs text-rose-600 mt-1">
                          {row.rejectionReason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{row.roleAtSubmission}</TableCell>
                    <TableCell>{`NPR ${row.amountNpr.toLocaleString("en-US")}`}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell>
                      {row.receiptUrl ? (
                        <a
                          href={row.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block"
                        >
                          <img
                            src={row.receiptUrl}
                            alt="Receipt"
                            className="w-16 h-16 object-cover rounded border"
                          />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          N/A
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onApprove(row.id)}
                          disabled={!canAct(row.status) || approveMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => onReject(row.id)}
                          disabled={!canAct(row.status) || rejectMutation.isPending}
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

