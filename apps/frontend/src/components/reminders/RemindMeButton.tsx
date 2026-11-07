"use client";

import { useState } from "react";
import { BellPlus } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { ReminderFormDialog, type ReminderLinkDefaults } from "./ReminderFormDialog";
import { useReminderText, type ReminderModuleProp } from "./reminderCopy";

/** Small "Remind me" button that opens the reminder form with the link filled in. */
export function RemindMeButton({
  module,
  link,
  defaultTitle,
  defaultAmount,
  linkName,
  label,
  size = "sm",
  className,
}: {
  module: ReminderModuleProp;
  link: ReminderLinkDefaults;
  defaultTitle?: string;
  /** Dealer: money to collect or pay, pre-filled (e.g. what the customer owes now). */
  defaultAmount?: number | null;
  /** Dealer: customer or company name, shown in the form's picker. */
  linkName?: string;
  /** Button text; "Remind me" when not given. */
  label?: string;
  /** Button size; small by default (detail pages), "default" on page headers. */
  size?: "sm" | "default";
  className?: string;
}) {
  const tr = useReminderText(module);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size={size} className={className} onClick={() => setOpen(true)}>
        <BellPlus className="mr-1.5 h-4 w-4" />
        {label ?? tr("remindMe")}
      </Button>
      <ReminderFormDialog
        module={module}
        open={open}
        onOpenChange={setOpen}
        defaults={{ ...link, title: defaultTitle, amount: defaultAmount, linkName }}
      />
    </>
  );
}
