"use client";

import { Badge } from "@/common/components/ui/badge";
import {
  Clock,
  CheckCircle,
  Truck,
  Package,
  DollarSign,
  XCircle,
  Ban,
} from "lucide-react";

interface ConsignmentStatusBadgeProps {
  status: string;
  className?: string;
}

export function ConsignmentStatusBadge({
  status,
  className,
}: ConsignmentStatusBadgeProps) {
  switch (status) {
    case "CREATED":
      return (
        <Badge variant="secondary" className={className}>
          <Clock className="h-3 w-3 mr-1" />
          Created
        </Badge>
      );
    case "ACCEPTED_PENDING_DISPATCH":
      return (
        <Badge variant="default" className={`bg-blue-600 ${className}`}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    case "DISPATCHED":
      return (
        <Badge variant="default" className={`bg-purple-600 ${className}`}>
          <Truck className="h-3 w-3 mr-1" />
          Dispatched
        </Badge>
      );
    case "RECEIVED":
      return (
        <Badge variant="default" className={`bg-green-600 ${className}`}>
          <Package className="h-3 w-3 mr-1" />
          Received
        </Badge>
      );
    case "SETTLED":
      return (
        <Badge variant="default" className={`bg-emerald-600 ${className}`}>
          <DollarSign className="h-3 w-3 mr-1" />
          Settled
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="secondary" className={`bg-gray-500 ${className}`}>
          <Ban className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      );
    default:
      return <Badge className={className}>{status}</Badge>;
  }
}

