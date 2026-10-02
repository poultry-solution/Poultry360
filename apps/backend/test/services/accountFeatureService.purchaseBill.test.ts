jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    accountFeature: {
      findMany: jest.fn(),
    },
  },
}));

import { UserRole } from "@prisma/client";
import prisma from "../../src/utils/prisma";
import {
  ACCOUNT_FEATURE_KEYS,
  getAdminResolvedAccountFeatures,
  getAccountFeatureDefinition,
  getResolvedAccountFeatures,
} from "../../src/services/accountFeatureService";

const mockedPrisma = prisma as unknown as {
  accountFeature: { findMany: jest.Mock };
};

describe("Farmer purchase bill account feature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.accountFeature.findMany.mockResolvedValue([]);
  });

  it("is available to Farmer accounts and defaults to off", async () => {
    const features = await getResolvedAccountFeatures(
      "farmer-1",
      UserRole.OWNER,
    );
    const feature = features.find(
      (item) => item.key === ACCOUNT_FEATURE_KEYS.FARMER_PURCHASE_BILL_UPLOAD,
    );

    expect(feature).toEqual(
      expect.objectContaining({
        key: "FARMER_PURCHASE_BILL_UPLOAD",
        enabled: false,
      }),
    );
    expect(
      getAccountFeatureDefinition(
        ACCOUNT_FEATURE_KEYS.FARMER_PURCHASE_BILL_UPLOAD,
      ),
    ).toEqual(
      expect.objectContaining({
        selfConfigurable: true,
        adminConfigurable: false,
      }),
    );
  });

  it("is hidden from Admin account controls", async () => {
    const features = await getAdminResolvedAccountFeatures(
      "farmer-1",
      UserRole.OWNER,
    );

    expect(
      features.some(
        (item) => item.key === ACCOUNT_FEATURE_KEYS.FARMER_PURCHASE_BILL_UPLOAD,
      ),
    ).toBe(false);
  });

  it("is not shown for non-Farmer accounts", async () => {
    const features = await getResolvedAccountFeatures(
      "dealer-1",
      UserRole.DEALER,
    );

    expect(
      features.some(
        (item) => item.key === ACCOUNT_FEATURE_KEYS.FARMER_PURCHASE_BILL_UPLOAD,
      ),
    ).toBe(false);
  });
});

describe("Farmer cFCR account feature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.accountFeature.findMany.mockResolvedValue([]);
  });

  it("is owned by the Farmer, defaults off, and is hidden from Admin", async () => {
    const features = await getResolvedAccountFeatures("farmer-1", UserRole.OWNER);
    expect(features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "FARMER_CFCR", enabled: false }),
      ]),
    );
    expect(getAccountFeatureDefinition(ACCOUNT_FEATURE_KEYS.FARMER_CFCR)).toEqual(
      expect.objectContaining({
        selfConfigurable: true,
        adminConfigurable: false,
      }),
    );

    const adminFeatures = await getAdminResolvedAccountFeatures(
      "farmer-1",
      UserRole.OWNER,
    );
    expect(adminFeatures.some((feature) => feature.key === "FARMER_CFCR")).toBe(false);
  });
});

describe("Hatchery purchase bill account feature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.accountFeature.findMany.mockResolvedValue([]);
  });

  it("is available to Hatchery accounts and defaults to off", async () => {
    const features = await getResolvedAccountFeatures(
      "hatchery-1",
      UserRole.HATCHERY,
    );
    const feature = features.find(
      (item) => item.key === ACCOUNT_FEATURE_KEYS.HATCHERY_PURCHASE_BILL_UPLOAD,
    );

    expect(feature).toEqual(
      expect.objectContaining({
        key: "HATCHERY_PURCHASE_BILL_UPLOAD",
        enabled: false,
      }),
    );
    expect(
      getAccountFeatureDefinition(
        ACCOUNT_FEATURE_KEYS.HATCHERY_PURCHASE_BILL_UPLOAD,
      ),
    ).toEqual(
      expect.objectContaining({
        selfConfigurable: true,
        adminConfigurable: false,
      }),
    );
  });

  it("is hidden from Admin account controls", async () => {
    const features = await getAdminResolvedAccountFeatures(
      "hatchery-1",
      UserRole.HATCHERY,
    );

    expect(
      features.some(
        (item) =>
          item.key === ACCOUNT_FEATURE_KEYS.HATCHERY_PURCHASE_BILL_UPLOAD,
      ),
    ).toBe(false);
  });
});

describe("Dealer purchase bill account feature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.accountFeature.findMany.mockResolvedValue([]);
  });

  it("is available to Dealer accounts and defaults to off", async () => {
    const features = await getResolvedAccountFeatures(
      "dealer-1",
      UserRole.DEALER,
    );
    const feature = features.find(
      (item) => item.key === ACCOUNT_FEATURE_KEYS.DEALER_PURCHASE_BILL_UPLOAD,
    );

    expect(feature).toEqual(
      expect.objectContaining({
        key: "DEALER_PURCHASE_BILL_UPLOAD",
        enabled: false,
      }),
    );
    expect(
      getAccountFeatureDefinition(
        ACCOUNT_FEATURE_KEYS.DEALER_PURCHASE_BILL_UPLOAD,
      ),
    ).toEqual(
      expect.objectContaining({
        selfConfigurable: true,
        adminConfigurable: false,
      }),
    );
  });

  it("is hidden from Admin account controls", async () => {
    const features = await getAdminResolvedAccountFeatures(
      "dealer-1",
      UserRole.DEALER,
    );

    expect(
      features.some(
        (item) => item.key === ACCOUNT_FEATURE_KEYS.DEALER_PURCHASE_BILL_UPLOAD,
      ),
    ).toBe(false);
  });
});

describe("Company purchase bill account feature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.accountFeature.findMany.mockResolvedValue([]);
  });

  it("is available to Company accounts and defaults to off", async () => {
    const features = await getResolvedAccountFeatures(
      "company-1",
      UserRole.COMPANY,
    );
    const feature = features.find(
      (item) => item.key === ACCOUNT_FEATURE_KEYS.COMPANY_PURCHASE_BILL_UPLOAD,
    );

    expect(feature).toEqual(
      expect.objectContaining({
        key: "COMPANY_PURCHASE_BILL_UPLOAD",
        enabled: false,
      }),
    );
    expect(
      getAccountFeatureDefinition(
        ACCOUNT_FEATURE_KEYS.COMPANY_PURCHASE_BILL_UPLOAD,
      ),
    ).toEqual(
      expect.objectContaining({
        selfConfigurable: true,
        adminConfigurable: false,
      }),
    );
  });

  it("is hidden from Admin account controls", async () => {
    const features = await getAdminResolvedAccountFeatures(
      "company-1",
      UserRole.COMPANY,
    );

    expect(
      features.some(
        (item) => item.key === ACCOUNT_FEATURE_KEYS.COMPANY_PURCHASE_BILL_UPLOAD,
      ),
    ).toBe(false);
  });
});
