"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { Clock, User, FileText } from "lucide-react";
import { formatDate } from "@/common/lib/utils";

export interface AuditLog {
  id: string;
  action: string;
  statusFrom?: string;
  statusTo: string;
  actor: {
    id: string;
    name: string;
    phone: string;
  };
  quantityChange?: number;
  documentRef?: string;
  notes?: string;
  createdAt: Date | string;
}

interface ConsignmentAuditTimelineProps {
  auditLogs: AuditLog[];
}

export function ConsignmentAuditTimeline({
  auditLogs,
}: ConsignmentAuditTimelineProps) {
  if (!auditLogs || auditLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No audit logs available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {auditLogs.map((log, index) => (
            <div
              key={log.id}
              className="flex gap-4 pb-4 border-b last:border-0 last:pb-0"
            >
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                {index < auditLogs.length - 1 && (
                  <div className="w-0.5 h-full bg-border min-h-[60px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.action}</Badge>
                    {log.statusFrom && log.statusTo && (
                      <span className="text-sm text-muted-foreground">
                        {log.statusFrom} → {log.statusTo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(log.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{log.actor.name}</span>
                  <span className="text-muted-foreground">
                    ({log.actor.phone})
                  </span>
                </div>

                {log.quantityChange !== undefined && log.quantityChange !== null && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Quantity: </span>
                    <span className="font-medium">{log.quantityChange}</span>
                  </div>
                )}

                {log.documentRef && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Reference: </span>
                    <span className="font-medium">{log.documentRef}</span>
                  </div>
                )}

                {log.notes && (
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                    {log.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

