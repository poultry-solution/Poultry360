/**
 * Unit tests for the Cloudinary cleanup helpers.
 *
 * The scenarios here mirror the attack surface flagged in the Nov 2026
 * review: a user storing another user's image URL on their own record and
 * then deleting the record. The helper must refuse to destroy anything
 * whose folder segment does not match the acting owner.
 */

const destroyMock = jest.fn<Promise<{ result: string }>, [string]>();

jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      destroy: (publicId: string) => destroyMock(publicId),
    },
    utils: {
      api_sign_request: jest.fn(() => "sig"),
    },
  },
}));

process.env.CLOUDINARY_CLOUD_NAME = "testcloud";

import {
  __awaitPendingCleanups,
  cleanupUploadedImage,
  cleanupUploadedImages,
  isUserOwnedUploadFolder,
  parseScopedCloudinaryUrl,
} from "../../src/utils/cloudinary";

const OWNER_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OWNER_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

const ownerUrl = (ownerId: string, folder = "products", file = "abc") =>
  `https://res.cloudinary.com/testcloud/image/upload/v1700000000/poultry360/${folder}/u_${ownerId}/${file}.jpg`;

const legacyUrl = (folder = "products", file = "legacy") =>
  `https://res.cloudinary.com/testcloud/image/upload/v1600000000/poultry360/${folder}/${file}.jpg`;

beforeEach(() => {
  destroyMock.mockReset();
  destroyMock.mockResolvedValue({ result: "ok" });
});

describe("parseScopedCloudinaryUrl", () => {
  it("extracts public id + owner segment for scoped URLs", () => {
    const parsed = parseScopedCloudinaryUrl(ownerUrl(OWNER_A));
    expect(parsed).toEqual({
      publicId: `poultry360/products/u_${OWNER_A}/abc`,
      ownerSegment: OWNER_A,
    });
  });

  it("extracts public id with null owner for legacy URLs", () => {
    const parsed = parseScopedCloudinaryUrl(legacyUrl());
    expect(parsed).toEqual({
      publicId: "poultry360/products/legacy",
      ownerSegment: null,
    });
  });

  it("returns null for URLs under a different Cloudinary account", () => {
    const url = ownerUrl(OWNER_A).replace("testcloud", "othercloud");
    expect(parseScopedCloudinaryUrl(url)).toBeNull();
  });

  it("returns null for URLs outside the poultry360/ root", () => {
    const url = "https://res.cloudinary.com/testcloud/image/upload/v1/other-app/products/u_x/f.jpg";
    expect(parseScopedCloudinaryUrl(url)).toBeNull();
  });

  it("returns null for malformed inputs", () => {
    expect(parseScopedCloudinaryUrl("not-a-url")).toBeNull();
    expect(parseScopedCloudinaryUrl("")).toBeNull();
    expect(parseScopedCloudinaryUrl(null)).toBeNull();
    expect(parseScopedCloudinaryUrl(undefined)).toBeNull();
  });

  it("returns null when multiple u_ segments disagree (defensive)", () => {
    const url = `https://res.cloudinary.com/testcloud/image/upload/v1/poultry360/u_${OWNER_A}/u_${OWNER_B}/f.jpg`;
    expect(parseScopedCloudinaryUrl(url)).toBeNull();
  });
});

describe("cleanupUploadedImage ownership rules", () => {
  it("destroys an image owned by the caller", async () => {
    cleanupUploadedImage(ownerUrl(OWNER_A), OWNER_A);
    await __awaitPendingCleanups();
    expect(destroyMock).toHaveBeenCalledTimes(1);
    expect(destroyMock).toHaveBeenCalledWith(`poultry360/products/u_${OWNER_A}/abc`);
  });

  it("refuses to destroy an image owned by a different user (the attack)", async () => {
    // User B passed User A's URL into a record they own, then deleted it.
    cleanupUploadedImage(ownerUrl(OWNER_A), OWNER_B);
    await __awaitPendingCleanups();
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it("skips legacy pre-scoping URLs even when deleted by any user", async () => {
    cleanupUploadedImage(legacyUrl(), OWNER_A);
    await __awaitPendingCleanups();
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it("skips non-Cloudinary URLs silently", async () => {
    cleanupUploadedImage("https://example.com/some-other.jpg", OWNER_A);
    await __awaitPendingCleanups();
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it("skips URLs on a different Cloudinary account", async () => {
    cleanupUploadedImage(ownerUrl(OWNER_A).replace("testcloud", "attacker"), OWNER_A);
    await __awaitPendingCleanups();
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it("tolerates null / empty URL", async () => {
    cleanupUploadedImage(null, OWNER_A);
    cleanupUploadedImage(undefined, OWNER_A);
    cleanupUploadedImage("", OWNER_A);
    await __awaitPendingCleanups();
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it("refuses to delete when ownerId is missing", async () => {
    cleanupUploadedImage(ownerUrl(OWNER_A), "");
    await __awaitPendingCleanups();
    expect(destroyMock).not.toHaveBeenCalled();
  });
});

describe("cleanupUploadedImage failure behaviour", () => {
  it("swallows a Cloudinary rejection without throwing", async () => {
    destroyMock.mockRejectedValueOnce(new Error("cloudinary down"));
    expect(() => cleanupUploadedImage(ownerUrl(OWNER_A), OWNER_A)).not.toThrow();
    await expect(__awaitPendingCleanups()).resolves.toBeUndefined();
  });

  it("times out instead of hanging forever on a slow Cloudinary", async () => {
    // Resolve after 10s; the helper's internal timeout is 3s. We rely on the
    // helper's `withTimeout` to reject so the pending set drains.
    jest.useFakeTimers();
    destroyMock.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ result: "ok" }), 10_000))
    );
    cleanupUploadedImage(ownerUrl(OWNER_A), OWNER_A);
    jest.advanceTimersByTime(4000);
    jest.useRealTimers();
    await expect(__awaitPendingCleanups()).resolves.toBeUndefined();
  });
});

describe("cleanupUploadedImages", () => {
  it("deduplicates and evaluates each URL independently", async () => {
    const mine = ownerUrl(OWNER_A, "products", "mine");
    const foreign = ownerUrl(OWNER_B, "products", "foreign");
    const legacy = legacyUrl("products", "old");
    cleanupUploadedImages([mine, mine, foreign, legacy, null], OWNER_A);
    await __awaitPendingCleanups();
    expect(destroyMock).toHaveBeenCalledTimes(1);
    expect(destroyMock).toHaveBeenCalledWith(`poultry360/products/u_${OWNER_A}/mine`);
  });
});

describe("isUserOwnedUploadFolder", () => {
  it("returns true only when the URL carries the caller's owner segment", () => {
    expect(isUserOwnedUploadFolder(ownerUrl(OWNER_A), OWNER_A)).toBe(true);
    expect(isUserOwnedUploadFolder(ownerUrl(OWNER_A), OWNER_B)).toBe(false);
    expect(isUserOwnedUploadFolder(legacyUrl(), OWNER_A)).toBe(false);
    expect(isUserOwnedUploadFolder("", OWNER_A)).toBe(false);
    expect(isUserOwnedUploadFolder(ownerUrl(OWNER_A), "")).toBe(false);
  });
});
