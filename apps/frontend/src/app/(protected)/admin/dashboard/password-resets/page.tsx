"use client";

import { useQuery } from "@tanstack/react-query";
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
import { KeyRound, RefreshCw, Clock } from "lucide-react";
import axiosInstance from "@/common/lib/axios";

interface PendingOtp {
  id: string;
  phone: string;
  otp: string;
  expiresAt: string;
  createdAt: string;
}

function useGetPendingOtps() {
  return useQuery<{ success: boolean; data: PendingOtp[] }>({
    queryKey: ["admin-pending-otps"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/admin/users/password-reset/otps");
      return data;
    },
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });
}

function getTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

export default function AdminPasswordResetsPage() {
  const { data, isLoading, refetch } = useGetPendingOtps();
  const otps = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Password Reset OTPs</h1>
        <p className="text-muted-foreground">
          Active OTP codes for users who requested a password reset. Share the OTP with the user when they call.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" />
              Pending OTPs
              {otps.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  {otps.length} active
                </span>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1 size-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-md border p-3">
                  <div className="h-4 w-28 rounded bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-4 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : otps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <KeyRound className="size-12 text-muted-foreground/30" />
              <p className="mt-2 text-muted-foreground">No pending OTPs</p>
              <p className="text-xs text-muted-foreground mt-1">
                OTPs will appear here when users request a password reset
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>OTP Code</TableHead>
                  <TableHead>Expires In</TableHead>
                  <TableHead>Requested At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otps.map((otp) => (
                  <TableRow key={otp.id}>
                    <TableCell className="font-medium">{otp.phone}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1 font-mono text-lg font-bold tracking-[0.3em] text-white">
                        {otp.otp}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <Clock className="size-3.5 text-muted-foreground" />
                        {getTimeRemaining(otp.expiresAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(otp.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
