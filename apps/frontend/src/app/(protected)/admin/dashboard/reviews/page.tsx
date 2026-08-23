"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
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
  type LandingReviewStatus,
  useAdminLandingReviews,
  useApproveLandingReview,
  useRejectLandingReview,
  useReturnLandingReviewToPending,
} from "@/fetchers/admin/adminLandingReviewQueries";

const statusOptions: Array<{ value: LandingReviewStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

function StatusBadge({ status }: { status: LandingReviewStatus }) {
  if (status === "APPROVED") {
    return (
      <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800">
        Approved
      </Badge>
    );
  }
  if (status === "REJECTED") {
    return (
      <Badge className="border border-rose-200 bg-rose-50 text-rose-800">
        Rejected
      </Badge>
    );
  }
  return <Badge variant="secondary">Pending</Badge>;
}

export default function AdminLandingReviewsPage() {
  const [status, setStatus] = useState<LandingReviewStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const reviewsQuery = useAdminLandingReviews({
    status,
    search,
    page,
    limit: 20,
  });
  const approve = useApproveLandingReview();
  const reject = useRejectLandingReview();
  const returnToPending = useReturnLandingReviewToPending();
  const rows = reviewsQuery.data?.data ?? [];
  const pagination = reviewsQuery.data?.pagination;
  const isMutating =
    approve.isPending || reject.isPending || returnToPending.isPending;

  const handleApprove = async (reviewId: string) => {
    try {
      await approve.mutateAsync({ reviewId });
      toast.success("Review approved and published");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to approve review");
    }
  };

  const handleReject = async (reviewId: string) => {
    const rejectionReason = window.prompt("Why is this review being rejected?");
    if (!rejectionReason?.trim()) return;

    try {
      await reject.mutateAsync({
        reviewId,
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("Review rejected");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to reject review");
    }
  };

  const handleReturnToPending = async (reviewId: string) => {
    try {
      await returnToPending.mutateAsync({ reviewId });
      toast.success("Review returned to pending");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to update review");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Review moderation</CardTitle>
          <CardDescription>
            Only approved reviews are published on the marketing homepage. Phone
            numbers are visible here for verification but never returned
            publicly.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as LandingReviewStatus);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, business, location, or phone"
          />
          <Button
            variant="outline"
            onClick={() => reviewsQuery.refetch()}
            disabled={reviewsQuery.isFetching}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {statusOptions.find((item) => item.value === status)?.label} reviews
          </CardTitle>
          <CardDescription>
            {reviewsQuery.isLoading
              ? "Loading..."
              : `${pagination?.total ?? 0} review(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="min-w-[320px]">Review</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No reviews found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="font-medium">{review.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {review.business}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {review.address}
                      </div>
                      <div className="mt-1 text-xs">{review.phoneNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex"
                        aria-label={`${review.stars} out of 5 stars`}
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className={`h-4 w-4 ${value <= review.stars ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="whitespace-pre-wrap text-sm">
                        {review.review}
                      </p>
                      {review.rejectionReason && (
                        <p className="mt-2 text-xs text-rose-600">
                          Reason: {review.rejectionReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={review.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[150px] flex-wrap gap-2">
                        {review.status !== "APPROVED" && (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(review.id)}
                            disabled={isMutating}
                          >
                            Approve
                          </Button>
                        )}
                        {review.status !== "REJECTED" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(review.id)}
                            disabled={isMutating}
                          >
                            Reject
                          </Button>
                        )}
                        {review.status !== "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturnToPending(review.id)}
                            disabled={isMutating}
                          >
                            Pending
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {(pagination?.totalPages ?? 0) > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pagination?.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((value) => value + 1)}
                disabled={page >= (pagination?.totalPages ?? 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
