"use client";

import { useEffect } from "react";

export function NumberInputWheelGuard() {
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const target = event.target;

      if (target instanceof HTMLInputElement && target.type === "number") {
        target.blur();
      }
    };

    window.addEventListener("wheel", handleWheel, { capture: true });

    return () => {
      window.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, []);

  return null;
}
