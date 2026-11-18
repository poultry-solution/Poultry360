import {
  buildListingAvailabilityBounds,
  normalizeListingDates,
} from "./list-for-sale-dates";
import { toNepalDayAd } from "./nepali-date";

describe("list-for-sale Nepal day bounds", () => {
  it("builds the full Nepal days selected in the form", () => {
    expect(
      buildListingAvailabilityBounds(
        "2026-10-13T00:00:00.000Z",
        "2026-10-20T00:00:00.000Z"
      )
    ).toEqual({
      availabilityFrom: "2026-10-13T00:00:00.000+05:45",
      availabilityTo: "2026-10-20T23:59:59.999+05:45",
    });
  });

  it("uses the Nepal day when a form value is a real moment", () => {
    expect(
      buildListingAvailabilityBounds(
        "2026-10-12T19:00:00.000Z",
        "2026-10-13T19:00:00.000Z"
      )
    ).toEqual({
      availabilityFrom: "2026-10-13T00:00:00.000+05:45",
      availabilityTo: "2026-10-14T23:59:59.999+05:45",
    });
  });

  it("keeps cleared form values empty for backend validation", () => {
    expect(buildListingAvailabilityBounds("", "")).toEqual({
      availabilityFrom: "",
      availabilityTo: "",
    });
  });

  it("repairs the exact legacy UTC day-end encoding", () => {
    const item = normalizeListingDates({
      id: "listing-1",
      availabilityFrom: "2026-10-13T00:00:00.000Z",
      availabilityTo: "2026-10-20T23:59:59.999Z",
    });

    expect(item).toEqual({
      id: "listing-1",
      availabilityFrom: "2026-10-13T00:00:00.000Z",
      availabilityTo: "2026-10-20T23:59:59.999+05:45",
    });
    expect(toNepalDayAd(item.availabilityTo!)).toBe("2026-10-20");
  });

  it("does not rewrite new bounds or unrelated real timestamps", () => {
    const newBound = "2026-10-20T18:14:59.999Z";
    const realMoment = "2026-10-20T19:00:00.000Z";
    const endLikeStartMoment = "2026-10-20T23:59:59.999Z";

    expect(
      normalizeListingDates({
        availabilityFrom: endLikeStartMoment,
        availabilityTo: newBound,
      })
    ).toEqual({
      availabilityFrom: endLikeStartMoment,
      availabilityTo: newBound,
    });
    expect(toNepalDayAd(newBound)).toBe("2026-10-20");
    expect(toNepalDayAd(realMoment)).toBe("2026-10-21");
  });
});
