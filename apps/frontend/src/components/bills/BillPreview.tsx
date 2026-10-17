"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { BILL_WIDTH_PX, BillDocument, type BillData } from "./BillDocument";

/**
 * The A4 bill shrunk to fit its box. The bill itself stays 794 px wide (only the
 * wrapper is scaled), so the image/PDF made from it are always full size.
 */
export const BillPreview = forwardRef<HTMLDivElement, { bill: BillData }>(function BillPreview({ bill }, ref) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    const update = () => {
      const next = Math.min(1, box.clientWidth / BILL_WIDTH_PX);
      setScale(next);
      setHeight(inner.offsetHeight * next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="bill-scale-box w-full overflow-hidden" style={{ height }}>
      <div ref={innerRef} className="bill-scale-inner" style={{ width: BILL_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <BillDocument ref={ref} bill={bill} />
      </div>
    </div>
  );
});
