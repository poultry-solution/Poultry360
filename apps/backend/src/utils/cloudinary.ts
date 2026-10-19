import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Generate a signed upload URL for direct browser-to-Cloudinary uploads.
 * This is the optimal approach as it:
 * - Avoids server bandwidth usage (file goes directly to Cloudinary)
 * - Reduces server load (no file processing on backend)
 * - Enables larger file uploads without server timeout issues
 */
export const generateSignedUploadParams = (folder: string = "poultry360") => {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Generate the signature
    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp,
            folder,
        },
        process.env.CLOUDINARY_API_SECRET as string
    );

    return {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder,
    };
};

/**
 * Delete an image from Cloudinary by its public ID.
 * Low-level helper. Callers must have already proved ownership.
 */
export const deleteImage = async (publicId: string): Promise<boolean> => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === "ok";
    } catch (error) {
        console.error("Failed to delete image from Cloudinary:", error);
        return false;
    }
};

// Only accept folder names made of safe characters so a caller cannot escape
// their scope by passing "../" or injecting Cloudinary parameters.
const SAFE_FOLDER_SEGMENT = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Build the per-account Cloudinary folder for an upload. The owner id is
 * embedded as a `u_<ownerId>` path segment so later deletions can confirm
 * ownership from the URL alone, without a cross-table lookup for every
 * image-bearing field in the schema.
 *
 * The caller must pass the acting business account id (JWT subject). The
 * frontend uploads with the exact folder string returned here, signed by
 * `generateSignedUploadParams`; Cloudinary rejects uploads whose folder
 * differs from the signed one, so a tampered client cannot land files in
 * another user's folder.
 *
 * Accepts single-segment folders ("products") and nested ones
 * ("purchase-bills/foo"). Historically some callers passed a value already
 * prefixed with "poultry360/" — we strip that so we never double-prefix.
 * Any unsafe segment (dots, special chars, overlong) collapses the whole
 * folder to the "products" default rather than silently escaping scope.
 */
export const buildScopedUploadFolder = (folder: string, ownerId: string): string => {
    const safeOwner = SAFE_FOLDER_SEGMENT.test(ownerId) ? ownerId : "unknown";
    const raw = typeof folder === "string" ? folder.trim() : "";
    const segments = raw.split("/").filter((s) => s.length > 0);
    // Drop a leading "poultry360" the caller may have included; we add it back.
    if (segments[0] === "poultry360") segments.shift();
    const allSafe = segments.length > 0 && segments.every((s) => SAFE_FOLDER_SEGMENT.test(s));
    const safeFolder = allSafe ? segments.join("/") : "products";
    return `poultry360/${safeFolder}/u_${safeOwner}`;
};

/**
 * Strict parse of a Cloudinary upload URL for *this* account.
 *
 * Returns the Cloudinary public id and, if the URL carries a `u_<id>`
 * ownership segment, that segment too. Legacy pre-scoping URLs parse
 * successfully with `ownerSegment: null` — callers decide what to do.
 *
 * Returns null for URLs that aren't ours (different host, different cloud
 * account, outside the poultry360/ prefix, or malformed).
 */
export type ParsedCloudinaryUrl = {
    publicId: string;
    ownerSegment: string | null;
};

export const parseScopedCloudinaryUrl = (
    rawUrl: string | null | undefined,
    cloudName: string | undefined = process.env.CLOUDINARY_CLOUD_NAME
): ParsedCloudinaryUrl | null => {
    if (!rawUrl || typeof rawUrl !== "string" || !cloudName) return null;
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return null;
    }
    if (url.host !== "res.cloudinary.com") return null;
    const prefix = `/${cloudName}/`;
    if (!url.pathname.startsWith(prefix)) return null;
    // Path after cloud name: /image/upload/[v<version>/]<folder>/<file>.<ext>
    const rest = url.pathname.slice(prefix.length);
    const match = rest.match(/^image\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    if (!match) return null;
    const publicId = match[1];
    const segments = publicId.split("/");
    // Must live under the app's root folder.
    if (segments[0] !== "poultry360") return null;
    // Look for a `u_<id>` segment anywhere in the path. There should be only
    // one; if several exist, require them all to agree (defensive).
    const owners = segments
        .filter((s) => /^u_[a-zA-Z0-9_-]{1,64}$/.test(s))
        .map((s) => s.slice(2));
    if (owners.length === 0) return { publicId, ownerSegment: null };
    const first = owners[0];
    if (!owners.every((o) => o === first)) return null;
    return { publicId, ownerSegment: first };
};

/**
 * Verify that a Cloudinary URL lives inside the given owner's scoped folder.
 * Used by the public upload-delete endpoint; mirrors the logic
 * `cleanupUploadedImage` enforces on server-initiated deletes.
 */
export const isUserOwnedUploadFolder = (url: string, ownerId: string): boolean => {
    if (!url || !ownerId) return false;
    const parsed = parseScopedCloudinaryUrl(url);
    return parsed !== null && parsed.ownerSegment === ownerId;
};

/**
 * Server-initiated cleanup. Call this *after* the owning DB row has been
 * removed. The caller must pass the acting account id (`req.userId`) — the
 * one whose JWT authorized the request.
 *
 * Rules enforced here (independent of what the caller believes about the URL):
 *
 * 1. URL must belong to this app's Cloudinary account and to the
 *    `poultry360/` prefix. Anything else is skipped silently.
 * 2. If the URL carries a `u_<id>` folder segment:
 *      - matches `ownerId` → destroy
 *      - does not match     → skip + warn (likely attempted cross-user purge)
 * 3. If the URL has no `u_<id>` segment (legacy pre-scoping upload) → skip.
 *    We cannot prove ownership from the URL alone, and the safer default is
 *    to leak an orphan asset than to delete someone else's file.
 *
 * **Non-blocking.** The DB write has already committed; a Cloudinary outage
 * must not stretch the user's response. Each destroy runs in a detached
 * micro-task with a hard timeout. Errors never surface to the caller.
 */
const PENDING_CLEANUPS = new Set<Promise<void>>();
const DESTROY_TIMEOUT_MS = 3000;

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("cloudinary destroy timeout")), ms);
        p.then(
            (v) => {
                clearTimeout(timer);
                resolve(v);
            },
            (e) => {
                clearTimeout(timer);
                reject(e);
            }
        );
    });

const scheduleDestroy = (publicId: string): void => {
    const task = (async () => {
        try {
            await withTimeout(cloudinary.uploader.destroy(publicId), DESTROY_TIMEOUT_MS);
        } catch (error) {
            console.error("cleanupUploadedImage: Cloudinary destroy failed", { publicId, error });
        }
    })();
    PENDING_CLEANUPS.add(task);
    task.finally(() => PENDING_CLEANUPS.delete(task));
};

export const cleanupUploadedImage = (
    url: string | null | undefined,
    ownerId: string
): void => {
    try {
        if (!ownerId) {
            console.error("cleanupUploadedImage: missing ownerId; refusing to delete", { url });
            return;
        }
        const parsed = parseScopedCloudinaryUrl(url);
        if (!parsed) return;
        if (parsed.ownerSegment === null) {
            // Legacy upload — we can't prove ownership from the URL. Leave it.
            console.warn("cleanupUploadedImage: skipping legacy unscoped URL", {
                publicId: parsed.publicId,
            });
            return;
        }
        if (parsed.ownerSegment !== ownerId) {
            // The DB row we are deleting carried another user's URL. Do not
            // destroy their asset. This is the attack signal from the review.
            console.warn("cleanupUploadedImage: owner mismatch; refusing to delete", {
                publicId: parsed.publicId,
                urlOwner: parsed.ownerSegment,
                caller: ownerId,
            });
            return;
        }
        scheduleDestroy(parsed.publicId);
    } catch (error) {
        // Belt-and-suspenders: never let anything escape to the caller.
        console.error("cleanupUploadedImage: unexpected error", { error });
    }
};

/**
 * Convenience wrapper for callers that collected several URLs from a parent
 * record (e.g. a sale with many payment receipts). Each URL is evaluated
 * against `ownerId` independently.
 */
export const cleanupUploadedImages = (
    urls: Array<string | null | undefined>,
    ownerId: string
): void => {
    try {
        const unique = Array.from(new Set(urls.filter((u): u is string => typeof u === "string" && !!u)));
        for (const u of unique) cleanupUploadedImage(u, ownerId);
    } catch (error) {
        console.error("cleanupUploadedImages: unexpected error", { error });
    }
};

/**
 * Test-only: wait for all pending detached destroys to finish. Not used in
 * production code; exported so Jest can assert destroy calls without racing.
 */
export const __awaitPendingCleanups = (): Promise<void> =>
    Promise.all(Array.from(PENDING_CLEANUPS)).then(() => undefined);

/**
 * Extract public ID from a Cloudinary URL.
 *
 * Kept for backwards compatibility with existing callers (e.g.
 * `uploadController.deleteUploadedImage`). New code should prefer
 * `parseScopedCloudinaryUrl` which also surfaces the owner segment.
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
    const parsed = parseScopedCloudinaryUrl(url);
    return parsed ? parsed.publicId : null;
};

export default cloudinary;
