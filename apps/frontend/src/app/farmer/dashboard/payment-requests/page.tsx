"use client";

import { useState } from "react";
import { DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  useGetFarmerPaymentRequests,
  useGetFarmerPaymentRequestStatistics,
} from "@/fetchers/payment/paymentRequestQueries";
import { useI18n } from "@/i18n/useI18n";

export default function FarmerPaymentRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const { t } = useI18n();

  // Queries
  const { data: requestsData, isLoading } = useGetFarmerPaymentRequests({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const { data: statsData } = useGetFarmerPaymentRequestStatistics();

  const formatCurrency = (amount: number | string) => {
    return `रू ${Number(amount).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          {t("farmer.paymentRequests.statusPending")}
        </Badge>
      ),
      APPROVED: (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t("farmer.paymentRequests.statusApproved")}
        </Badge>
      ),
      REJECTED: (
        <Badge variant="outline" className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          {t("farmer.paymentRequests.statusRejected")}
        </Badge>
      ),
    };
    return variants[status as keyof typeof variants] || status;
  };

  const stats = statsData?.data || {
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    pendingAmount: 0,
  };

  const requests = requestsData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("farmer.paymentRequests.title")}</h1>
        <p className="text-muted-foreground">{t("farmer.paymentRequests.subtitle")}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("farmer.paymentRequests.help")}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("farmer.paymentRequests.stats.pending")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(stats.pendingAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("farmer.paymentRequests.stats.approved")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("farmer.paymentRequests.stats.rejected")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("farmer.paymentRequests.stats.total")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>{t("farmer.paymentRequests.filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("farmer.paymentRequests.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("farmer.paymentRequests.statusAll")}</SelectItem>
              <SelectItem value="PENDING">{t("farmer.paymentRequests.stats.pending")}</SelectItem>
              <SelectItem value="APPROVED">{t("farmer.paymentRequests.stats.approved")}</SelectItem>
              <SelectItem value="REJECTED">{t("farmer.paymentRequests.stats.rejected")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="text-center py-8">{t("farmer.paymentRequests.loading")}</CardContent>
          </Card>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              <p>{t("farmer.paymentRequests.emptyTitle")}</p>
              <p className="text-sm mt-2">
                {t("farmer.paymentRequests.emptyHelp")}
              </p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request: any) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {request.requestNumber}
                    </CardTitle>
                    <CardDescription>
                      {t("farmer.paymentRequests.invoice")}: {request.dealerSale?.invoiceNumber}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm text-muted-foreground">{t("farmer.paymentRequests.dealer")}</div>
                    <div className="font-medium">{request.dealer?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {request.dealer?.contact}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t("farmer.paymentRequests.amount")}</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(request.amount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t("farmer.paymentRequests.date")}</div>
                    <div>{formatDate(request.createdAt)}</div>
                  </div>
                  {request.paymentReference && (
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {t("farmer.paymentRequests.reference")}
                      </div>
                      <div>{request.paymentReference}</div>
                    </div>
                  )}
                  {request.description && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">
                        {t("farmer.paymentRequests.description")}
                      </div>
                      <div>{request.description}</div>
                    </div>
                  )}
                  {request.status === "REJECTED" && request.rejectionReason && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-red-600 font-medium">
                        {t("farmer.paymentRequests.rejectionReason")}
                      </div>
                      <div className="text-red-600">
                        {request.rejectionReason}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
