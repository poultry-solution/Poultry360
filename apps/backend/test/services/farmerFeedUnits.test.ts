import {
  DEFAULT_FEED_BAG_KG,
  isSupportedFarmerFeedUnit,
  resolveFeedKgPerUnit,
  resolveNewFarmerFeedUnit,
} from "../../src/utils/farmerFeedUnits";

describe("Farmer feed units", () => {
  it("allows only KG and Bag for new Farmer feed stock", () => {
    expect(isSupportedFarmerFeedUnit("KG")).toBe(true);
    expect(isSupportedFarmerFeedUnit(" kg ")).toBe(true);
    expect(isSupportedFarmerFeedUnit("Bag")).toBe(true);
    expect(isSupportedFarmerFeedUnit("Sack")).toBe(false);
    expect(isSupportedFarmerFeedUnit("Packet")).toBe(false);
    expect(isSupportedFarmerFeedUnit("Quintal")).toBe(false);
  });

  it("uses one kilogram for KG stock", () => {
    expect(resolveFeedKgPerUnit({ unit: "KG" })).toBe(1);
    expect(10 * (resolveFeedKgPerUnit({ unit: "KG" }) as number)).toBe(10);
  });

  it("defaults a missing unit from an old client to kg", () => {
    expect(resolveNewFarmerFeedUnit(undefined)).toBe("kg");
    expect(resolveNewFarmerFeedUnit("  ")).toBe("kg");
  });

  it("defaults a Bag item to 50 kilograms", () => {
    expect(resolveFeedKgPerUnit({ unit: "Bag" })).toBe(DEFAULT_FEED_BAG_KG);
    expect(2 * (resolveFeedKgPerUnit({ unit: "Bag" }) as number)).toBe(100);
  });

  it("keeps a custom kilogram value on each Bag item", () => {
    expect(resolveFeedKgPerUnit({ unit: "Bag", kgPerUnit: 10 })).toBe(10);
    expect(
      2 * (resolveFeedKgPerUnit({ unit: "Bag", kgPerUnit: 10 }) as number),
    ).toBe(20);
  });

  it("adds mixed KG and Bag feed in kilograms", () => {
    const kgFeed = 10 * (resolveFeedKgPerUnit({ unit: "KG" }) as number);
    const bagFeed =
      2 * (resolveFeedKgPerUnit({ unit: "Bag" }) as number);

    expect(kgFeed + bagFeed).toBe(110);
  });

  it("keeps an explicit conversion for old units but never guesses one", () => {
    expect(resolveFeedKgPerUnit({ unit: "kilograms" })).toBe(1);
    expect(resolveFeedKgPerUnit({ unit: "Sack", kgPerUnit: 25 })).toBe(25);
    expect(resolveFeedKgPerUnit({ unit: "Sack" })).toBeNull();
  });
});
