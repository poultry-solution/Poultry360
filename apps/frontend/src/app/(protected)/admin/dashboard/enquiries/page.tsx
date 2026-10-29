"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
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
import { demoEnquiryFollowUp, type AdminDemoEnquiry } from "@/fetchers/admin/demoEnquiryQueries";
import { landingContactFollowUp, type AdminLandingContact } from "@/fetchers/admin/landingContactQueries";
import type { EnquiryStatus, makeEnquiryFollowUpHooks } from "@/fetchers/admin/enquiryFollowUp";

const LIST_LIMIT = 200;

/** "20 Oct 2026, 11:39": short enough to keep the table narrow. */
const formatWhen = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

type FollowUpHooks<T> = ReturnType<typeof makeEnquiryFollowUpHooks<T>>;
type Column<T> = { label: string; render: (row: T) => ReactNode };

const empty = <Badge variant="outline">--</Badge>;

function PhoneLink({ phone }: { phone?: string | null }) {
  if (!phone) return empty;
  return (
    <a href={`tel:${phone}`} className="text-muted-foreground hover:text-foreground hover:underline">
      {phone}
    </a>
  );
}

/** One lead list (Book a demo or Contact form) with New / Contacted tabs. */
function EnquirySection<T extends { id: string }>({
  title,
  subtitle,
  hooks,
  columns,
}: {
  title: string;
  subtitle: string;
  hooks: FollowUpHooks<T>;
  columns: Column<T>[];
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<EnquiryStatus>("new");
  const { data, isLoading, isError, refetch, isFetching } = hooks.useList(status, LIST_LIMIT);
  const setContacted = hooks.useSetContacted();
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = data?.data ?? [];
  const counts = data?.counts;

  const toggle = async (id: string) => {
    const contacted = status === "new";
    setBusyId(id);
    try {
      await setContacted.mutateAsync({ id, contacted });
      toast.success(t(contacted ? "admin.enquiries.markedContacted" : "admin.enquiries.movedToNew"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("admin.enquiries.updateFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const tabs: Array<[EnquiryStatus, string, number | undefined]> = [
    ["new", t("admin.enquiries.tabNew"), counts?.new],
    ["contacted", t("admin.enquiries.tabContacted"), counts?.contacted],
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          {t("admin.enquiries.refresh")}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex border-b">
          {tabs.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                status === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {count !== undefined && ` (${count})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("admin.enquiries.loading")}</p>
        ) : isError ? (
          <p className="text-sm text-red-600">{t("admin.enquiries.loadFailed")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(status === "new" ? "admin.enquiries.emptyNew" : "admin.enquiries.emptyContacted")}
          </p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.label}>{column.label}</TableHead>
                  ))}
                  <TableHead>{t("admin.enquiries.submittedAt")}</TableHead>
                  {status === "contacted" && <TableHead>{t("admin.enquiries.contactedAt")}</TableHead>}
                  <TableHead className="text-right">{t("admin.enquiries.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((column) => (
                      <TableCell key={column.label}>{column.render(row)}</TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatWhen(row.createdAt)}
                    </TableCell>
                    {status === "contacted" && (
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {row.contactedAt ? formatWhen(row.contactedAt) : "--"}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={status === "new" ? "default" : "outline"}
                        disabled={busyId === row.id}
                        onClick={() => void toggle(row.id)}
                      >
                        {busyId === row.id
                          ? t("admin.enquiries.saving")
                          : t(status === "new" ? "admin.enquiries.markContacted" : "admin.enquiries.moveToNew")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const messageCell = (message?: string | null) =>
  message ? <span className="block max-w-[360px] line-clamp-2">{message}</span> : empty;

export default function AdminEnquiriesPage() {
  const { t } = useI18n();

  const demoColumns: Column<AdminDemoEnquiry>[] = [
    { label: t("admin.demoEnquiries.company"), render: (e) => <span className="font-medium">{e.companyName}</span> },
    { label: t("admin.demoEnquiries.phone"), render: (e) => <PhoneLink phone={e.phoneNumber} /> },
    {
      label: t("admin.demoEnquiries.businessType"),
      render: (e) =>
        (e.businessTypes ?? []).length > 0 ? (
          <div className="flex max-w-[260px] flex-wrap gap-1">
            {e.businessTypes.map((type) => (
              <Badge key={type} variant="outline">
                {type}
              </Badge>
            ))}
          </div>
        ) : (
          empty
        ),
    },
    { label: t("admin.demoEnquiries.message"), render: (e) => messageCell(e.message) },
  ];

  const contactColumns: Column<AdminLandingContact>[] = [
    {
      label: t("admin.enquiries.name"),
      render: (c) => <span className="font-medium">{`${c.firstName} ${c.lastName}`.trim()}</span>,
    },
    { label: t("admin.enquiries.email"), render: (c) => <span className="text-muted-foreground">{c.email}</span> },
    { label: t("admin.enquiries.phone"), render: (c) => <PhoneLink phone={c.phone} /> },
    {
      label: t("admin.enquiries.farmType"),
      render: (c) => (c.farmType ? <Badge variant="outline">{c.farmType}</Badge> : empty),
    },
    { label: t("admin.enquiries.message"), render: (c) => messageCell(c.message) },
  ];

  return (
    <div className="space-y-4">
      <EnquirySection
        title={t("admin.demoEnquiries.title")}
        subtitle={t("admin.demoEnquiries.subtitle")}
        hooks={demoEnquiryFollowUp}
        columns={demoColumns}
      />
      <EnquirySection
        title={t("admin.enquiries.contactTitle")}
        subtitle={t("admin.enquiries.contactSubtitle")}
        hooks={landingContactFollowUp}
        columns={contactColumns}
      />
    </div>
  );
}
