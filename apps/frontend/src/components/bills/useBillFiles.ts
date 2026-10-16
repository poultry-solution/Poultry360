"use client";

import { useEffect, useState, type RefObject } from "react";
import { makeBillFiles, type BillFiles } from "./billExport";
import type { BillData } from "./BillDocument";

/** Makes the bill image and PDF as soon as the bill is on screen, so Share is instant. */
export function useBillFiles(ref: RefObject<HTMLDivElement | null>, bill: BillData | undefined, enabled = true) {
  const [files, setFiles] = useState<BillFiles | null>(null);
  const [failed, setFailed] = useState(false);
  // Remake the files when the bill content changes (e.g. Bill details finish loading).
  const key = bill ? JSON.stringify(bill) : "";

  useEffect(() => {
    if (!enabled || !bill) return;
    let cancelled = false;
    setFiles(null);
    setFailed(false);
    const timer = setTimeout(async () => {
      if (!ref.current) return;
      try {
        const made = await makeBillFiles(ref.current, bill.fileName);
        if (!cancelled) setFiles(made);
      } catch (error) {
        console.error("Bill image error:", error);
        if (!cancelled) setFailed(true);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { files, preparing: enabled && !!bill && !files && !failed, failed };
}
