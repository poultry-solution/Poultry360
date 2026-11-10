"use client";

import { createElement } from "react";
import Script from "next/script";

/** One Wistia video (same embed as the landing Hero). Loads Wistia's scripts only where it is shown. */
export function WistiaPlayer({ mediaId, aspect = 16 / 9 }: { mediaId: string; aspect?: number }) {
  return (
    <>
      <Script src="https://fast.wistia.com/player.js" strategy="afterInteractive" />
      <Script src={`https://fast.wistia.com/embed/${mediaId}.js`} type="module" strategy="afterInteractive" />
      {createElement("wistia-player", {
        key: mediaId,
        "media-id": mediaId,
        aspect: String(aspect),
        style: { height: "100%", width: "100%" },
      })}
    </>
  );
}
