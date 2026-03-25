"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { useI18n } from "@/i18n/useI18n";
import { useGetAdminDemoEnquiries } from "@/fetchers/admin/demoEnquiryQueries";

export default function AdminDemoEnquiriesPage() {
  const { t } = useI18n();
  const [limit] = useState(200);

  const { data, isLoading, refetch } = useGetAdminDemoEnquiries(limit);

  const enquiries = useMemo(() => data?.data ?? [], [data?.data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{t("admin.demoEnquiries.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("admin.demoEnquiries.subtitle")}
            </p>
          </div>

          <Button type="button" variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : enquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.demoEnquiries.empty")}</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.demoEnquiries.company")}</TableHead>
                    <TableHead>{t("admin.demoEnquiries.phone")}</TableHead>
                    <TableHead>{t("admin.demoEnquiries.message")}</TableHead>
                    <TableHead>{t("admin.demoEnquiries.createdAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enquiries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.companyName}</TableCell>
                      <TableCell className="text-muted-foreground">{e.phoneNumber}</TableCell>
                      <TableCell>
                        {e.message ? (
                          <span className="line-clamp-2 max-w-[360px] block">
                            {e.message}
                          </span>
                        ) : (
                          <Badge variant="outline">--</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

