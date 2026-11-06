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
  className,
}: {
  module: ReminderModuleProp;
  link: ReminderLinkDefaults;
  defaultTitle?: string;
  className?: string;
}) {
  const tr = useReminderText(module);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
        <BellPlus className="mr-1.5 h-4 w-4" />
        {tr("remindMe")}
      </Button>
      <ReminderFormDialog
        module={module}
        open={open}
        onOpenChange={setOpen}
        defaults={{ ...link, title: defaultTitle }}
      />
    </>
  );
}
