import React from "react";

interface BannerProps {
  type: "success" | "error";
  message: string;
}

export function Banner({ type, message }: BannerProps) {
  const base = "rounded-md px-3 py-2 text-sm border";
  const styles =
    type === "success"
      ? "bg-green-50 text-green-800 border-green-200"
      : "bg-red-50 text-red-800 border-red-200";
  return <div className={`${base} ${styles}`}>{message}</div>;
}
