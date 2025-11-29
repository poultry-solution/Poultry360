import prisma from "./prisma";
import { ConsignmentStatus, ConsignmentDirection } from "@prisma/client";

/**
 * Validate state transition according to state machine rules
 */
export function validateStateTransition(
  from: ConsignmentStatus,
  to: ConsignmentStatus
): void {
  const validTransitions: Record<ConsignmentStatus, ConsignmentStatus[]> = {
    CREATED: [
      ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
      ConsignmentStatus.REJECTED,
      ConsignmentStatus.CANCELLED,
    ],
    ACCEPTED_PENDING_DISPATCH: [
      ConsignmentStatus.DISPATCHED,
      ConsignmentStatus.REJECTED,
      ConsignmentStatus.CANCELLED,
    ],
    DISPATCHED: [ConsignmentStatus.RECEIVED],
    RECEIVED: [ConsignmentStatus.SETTLED],
    SETTLED: [],
    REJECTED: [],
    CANCELLED: [],
  };

  if (!validTransitions[from]?.includes(to)) {
    throw new Error(
      `Invalid state transition from ${from} to ${to}. Valid transitions: ${validTransitions[from]?.join(", ") || "none"}`
    );
  }
}

/**
 * Validate inventory availability for company products
 */
export async function validateInventoryAvailability(
  companyId: string,
  items: Array<{
    productId: string;
    quantity: number;
  }>
): Promise<void> {
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { currentStock: true, name: true },
    });

    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }

    const availableStock = Number(product.currentStock || 0);
    if (availableStock < item.quantity) {
      throw new Error(
        `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`
      );
    }
  }
}

/**
 * Validate user permission for consignment action
 */
export async function validateUserPermission(
  userId: string,
  consignmentId: string,
  action: string
): Promise<{
  isAuthorized: boolean;
  role: "COMPANY" | "DEALER" | "FARMER" | null;
  reason?: string;
}> {
  const consignment = await prisma.consignmentRequest.findUnique({
    where: { id: consignmentId },
    select: {
      fromCompanyId: true,
      fromDealerId: true,
      toDealerId: true,
      toFarmerId: true,
      direction: true,
    },
  });

  if (!consignment) {
    return {
      isAuthorized: false,
      role: null,
      reason: "Consignment not found",
    };
  }

  // Check if user is company owner
  const company = await prisma.company.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  if (company && consignment.fromCompanyId === company.id) {
    return { isAuthorized: true, role: "COMPANY" };
  }

  // Check if user is dealer owner
  const dealer = await prisma.dealer.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  if (dealer) {
    if (
      consignment.toDealerId === dealer.id ||
      consignment.fromDealerId === dealer.id
    ) {
      return { isAuthorized: true, role: "DEALER" };
    }
  }

  // Check if user is farmer
  if (consignment.toFarmerId === userId) {
    return { isAuthorized: true, role: "FARMER" };
  }

  return {
    isAuthorized: false,
    role: null,
    reason: "User is not authorized to perform this action on this consignment",
  };
}

/**
 * Validate quantities (approved <= requested, received <= dispatched, etc.)
 */
export function validateQuantities(items: Array<{
  requested?: number;
  approved?: number;
  dispatched?: number;
  received?: number;
}>): void {
  for (const item of items) {
    if (item.approved !== undefined && item.requested !== undefined) {
      if (item.approved > item.requested) {
        throw new Error(
          `Approved quantity (${item.approved}) cannot exceed requested quantity (${item.requested})`
        );
      }
      if (item.approved < 0) {
        throw new Error("Approved quantity cannot be negative");
      }
    }

    if (item.dispatched !== undefined && item.approved !== undefined) {
      if (item.dispatched > item.approved) {
        throw new Error(
          `Dispatched quantity (${item.dispatched}) cannot exceed approved quantity (${item.approved})`
        );
      }
    }

    if (item.received !== undefined && item.dispatched !== undefined) {
      if (item.received > item.dispatched) {
        throw new Error(
          `Received quantity (${item.received}) cannot exceed dispatched quantity (${item.dispatched})`
        );
      }
    }
  }
}

/**
 * Check if consignment can be cancelled
 */
export function canCancelConsignment(status: ConsignmentStatus): boolean {
  const cancellableStatuses: ConsignmentStatus[] = [
    ConsignmentStatus.CREATED,
    ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
  ];
  return cancellableStatuses.includes(status);
}

/**
 * Check if consignment can be rejected
 */
export function canRejectConsignment(status: ConsignmentStatus): boolean {
  const rejectableStatuses: ConsignmentStatus[] = [
    ConsignmentStatus.CREATED,
    ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
  ];
  return rejectableStatuses.includes(status);
}

/**
 * Check if consignment can be dispatched
 */
export function canDispatchConsignment(status: ConsignmentStatus): boolean {
  return status === ConsignmentStatus.ACCEPTED_PENDING_DISPATCH;
}

/**
 * Check if consignment can receive advance payment
 */
export function canRecordAdvancePayment(status: ConsignmentStatus): boolean {
  const advancePaymentStatuses: ConsignmentStatus[] = [
    ConsignmentStatus.CREATED,
    ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
    ConsignmentStatus.DISPATCHED,
  ];
  return advancePaymentStatuses.includes(status);
}

