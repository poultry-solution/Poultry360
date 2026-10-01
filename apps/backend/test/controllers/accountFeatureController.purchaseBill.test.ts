jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("../../src/services/accountFeatureService", () => {
  const actual = jest.requireActual("../../src/services/accountFeatureService");
  return {
    ...actual,
    setAccountFeature: jest.fn(),
  };
});

jest.mock("../../src/services/businessAuditService", () => ({
  writeBusinessAudit: jest.fn(),
}));

import { UserRole } from "@prisma/client";
import prisma from "../../src/utils/prisma";
import { setAccountFeature } from "../../src/services/accountFeatureService";
import {
  updateAdminAccountFeature,
  updateCurrentAccountFeature,
} from "../../src/controller/accountFeatureController";

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
};
const mockedSetAccountFeature = setAccountFeature as jest.Mock;

function makeResponse() {
  const response: any = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("Farmer-owned purchase bill setting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ role: UserRole.OWNER });
    mockedSetAccountFeature.mockResolvedValue({
      key: "FARMER_PURCHASE_BILL_UPLOAD",
      name: "Farmer Purchase Bill Upload",
      enabled: true,
      updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    });
  });

  it("lets the Farmer change the setting for their own account", async () => {
    const response = makeResponse();

    await updateCurrentAccountFeature(
      {
        userId: "farmer-1",
        params: { featureKey: "FARMER_PURCHASE_BILL_UPLOAD" },
        body: { enabled: true },
      } as any,
      response,
    );

    expect(mockedSetAccountFeature).toHaveBeenCalledWith({
      accountId: "farmer-1",
      featureKey: "FARMER_PURCHASE_BILL_UPLOAD",
      enabled: true,
      updatedById: "farmer-1",
    });
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("does not let users change other protected account features", async () => {
    const response = makeResponse();

    await updateCurrentAccountFeature(
      {
        userId: "farmer-1",
        params: { featureKey: "SELF_FEED_PRODUCTION" },
        body: { enabled: true },
      } as any,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(mockedSetAccountFeature).not.toHaveBeenCalled();
  });

  it("does not show this owner-controlled setting through the Admin update API", async () => {
    const response = makeResponse();

    await updateAdminAccountFeature(
      {
        userId: "admin-1",
        params: {
          id: "farmer-1",
          featureKey: "FARMER_PURCHASE_BILL_UPLOAD",
        },
        body: { enabled: true },
      } as any,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(mockedSetAccountFeature).not.toHaveBeenCalled();
  });

  it("lets the Hatchery owner change the Hatchery bill setting", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ role: UserRole.HATCHERY });
    mockedSetAccountFeature.mockResolvedValue({
      key: "HATCHERY_PURCHASE_BILL_UPLOAD",
      name: "Hatchery Purchase Bill Upload",
      enabled: true,
      updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const response = makeResponse();

    await updateCurrentAccountFeature(
      {
        userId: "hatchery-1",
        params: { featureKey: "HATCHERY_PURCHASE_BILL_UPLOAD" },
        body: { enabled: true },
      } as any,
      response,
    );

    expect(mockedSetAccountFeature).toHaveBeenCalledWith({
      accountId: "hatchery-1",
      featureKey: "HATCHERY_PURCHASE_BILL_UPLOAD",
      enabled: true,
      updatedById: "hatchery-1",
    });
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("lets the Dealer owner change the Dealer bill setting", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ role: UserRole.DEALER });
    mockedSetAccountFeature.mockResolvedValue({
      key: "DEALER_PURCHASE_BILL_UPLOAD",
      name: "Dealer Purchase Bill Upload",
      enabled: true,
      updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const response = makeResponse();

    await updateCurrentAccountFeature(
      {
        userId: "dealer-1",
        params: { featureKey: "DEALER_PURCHASE_BILL_UPLOAD" },
        body: { enabled: true },
      } as any,
      response,
    );

    expect(mockedSetAccountFeature).toHaveBeenCalledWith({
      accountId: "dealer-1",
      featureKey: "DEALER_PURCHASE_BILL_UPLOAD",
      enabled: true,
      updatedById: "dealer-1",
    });
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("lets the Company owner change the Company bill setting", async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ role: UserRole.COMPANY });
    mockedSetAccountFeature.mockResolvedValue({
      key: "COMPANY_PURCHASE_BILL_UPLOAD",
      name: "Company Purchase Bill Upload",
      enabled: true,
      updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const response = makeResponse();

    await updateCurrentAccountFeature(
      {
        userId: "company-1",
        params: { featureKey: "COMPANY_PURCHASE_BILL_UPLOAD" },
        body: { enabled: true },
      } as any,
      response,
    );

    expect(mockedSetAccountFeature).toHaveBeenCalledWith({
      accountId: "company-1",
      featureKey: "COMPANY_PURCHASE_BILL_UPLOAD",
      enabled: true,
      updatedById: "company-1",
    });
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});
