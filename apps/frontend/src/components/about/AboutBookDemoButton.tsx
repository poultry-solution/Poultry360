"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import BookDemoModal from "@/components/landing/BookDemoModal";

export function AboutBookDemoButton({
  variant = "outline",
  className = "",
  label = "Book a demo",
}: {
  variant?: "outline" | "solid";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "solid" ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className={className}
        >
          {label}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={className}
        >
          {label} <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      )}

      <BookDemoModal open={open} onOpenChange={setOpen} />
    </>
  );
}
