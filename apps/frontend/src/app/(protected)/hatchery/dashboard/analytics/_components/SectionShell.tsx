"use client";

import type { ReactNode } from "react";

export function SectionShell({
  title,
  description,
  action,
  flush,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** No inner padding, for tables. */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {description ? <p className="text-xs text-gray-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className={flush ? "" : "p-4"}>{children}</div>
    </div>
  );
}
