import { ImageResponse } from "next/og";
import {
  formatBlogDate,
  getPublishedBlogPostBySlug,
  isBlogApiUnavailable,
} from "@/lib/blog";

export const alt = "Poultry360 blog article";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const dynamic = "force-dynamic";

type OpenGraphImageProps = {
  params: Promise<{ slug: string }>;
};

function fitTitle(title: string) {
  const normalized = title.replace(/\s+/g, " ").trim();

  if (normalized.length <= 110) return normalized;
  return `${normalized.slice(0, 107).trimEnd()}…`;
}

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { slug } = await params;
  let post = null;

  try {
    post = await getPublishedBlogPostBySlug(slug);
  } catch (error) {
    if (!isBlogApiUnavailable(error)) throw error;
  }

  const title = fitTitle(post?.title || "Poultry farming insights for smarter decisions");
  const titleSize = title.length > 82 ? 54 : title.length > 55 ? 62 : 70;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #f7fbf5 0%, #ecf7e8 58%, #dff1d9 100%)",
          color: "#132018",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 440,
            height: 440,
            borderRadius: 999,
            background: "rgba(118, 189, 52, 0.13)",
            left: -190,
            bottom: -270,
          }}
        />

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "62px 64px 52px 70px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#207a36",
                color: "white",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: -1,
              }}
            >
              P360
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
              <div style={{ fontSize: 31, fontWeight: 800, letterSpacing: -1.2 }}>Poultry360</div>
              <div style={{ fontSize: 15, color: "#52705b", marginTop: 2 }}>SMART POULTRY MANAGEMENT</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 58,
              color: "#207a36",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 1.7,
              textTransform: "uppercase",
            }}
          >
            Poultry360 Blog
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 18,
              maxWidth: 1010,
              fontSize: titleSize,
              lineHeight: 1.06,
              fontWeight: 800,
              letterSpacing: -2.6,
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "auto",
              color: "#52645a",
              fontSize: 19,
            }}
          >
            <span>{post ? `By ${post.authorName}` : "Expert insights for poultry professionals"}</span>
            {post?.publishedAt ? (
              <>
                <span style={{ margin: "0 13px", color: "#87a08d" }}>•</span>
                <span>{formatBlogDate(post.publishedAt)}</span>
              </>
            ) : null}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 62,
            bottom: 50,
            display: "flex",
            width: 150,
            height: 10,
            borderRadius: 999,
            background: "#76bd34",
          }}
        />
      </div>
    ),
    size
  );
}
