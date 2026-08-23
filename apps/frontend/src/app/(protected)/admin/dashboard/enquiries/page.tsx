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
import { useLandingContacts } from "@/fetchers/public/contactQueries";

export default function AdminDemoEnquiriesPage() {
  const { t } = useI18n();
  const [limit] = useState(200);

  const {
    data: demoData,
    isLoading: isDemoLoading,
    refetch: refetchDemo,
  } = useGetAdminDemoEnquiries(limit);
  const {
    data: contactData,
    isLoading: isContactLoading,
    refetch: refetchContacts,
  } = useLandingContacts(limit);

  const enquiries = useMemo(() => demoData?.data ?? [], [demoData?.data]);
  const contacts = useMemo(() => contactData?.data ?? [], [contactData?.data]);

  const handleRefresh = () => {
    void refetchDemo();
    void refetchContacts();
  };

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

          <Button type="button" variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {isDemoLoading ? (
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
                    <TableHead>{t("admin.demoEnquiries.businessType")}</TableHead>
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
                        {(e.businessTypes ?? []).length > 0 ? (
                          <div className="flex max-w-[260px] flex-wrap gap-1">
                            {e.businessTypes.map((businessType) => (
                              <Badge key={businessType} variant="outline">
                                {businessType}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="outline">--</Badge>
                        )}
                      </TableCell>
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

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Contact Form Submissions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Messages submitted from the public contact form on the marketing site.
            </p>
          </div>

          <Button type="button" variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {isContactLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contact form submissions found.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Farm Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.phone || "--"}
                      </TableCell>
                      <TableCell>
                        {contact.farmType ? (
                          <Badge variant="outline">{contact.farmType}</Badge>
                        ) : (
                          <Badge variant="outline">--</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-2 block max-w-[360px]">
                          {contact.message}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(contact.createdAt).toLocaleString()}
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
