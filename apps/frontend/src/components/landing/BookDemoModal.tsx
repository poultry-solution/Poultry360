"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { Textarea } from "@/common/components/ui/textarea";
import { Button } from "@/common/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import { useCreateDemoEnquiry } from "@/fetchers/public/demoEnquiryQueries";

export default function BookDemoModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const createDemoEnquiry = useCreateDemoEnquiry();

  const [companyName, setCompanyName] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    // Keep existing input if user re-opens quickly.
  }, [open]);

  const canSubmit =
    companyName.trim().length >= 2 &&
    phoneLocal.trim().length >= 7 &&
    !createDemoEnquiry.isPending;

  const onSubmit = async () => {
    try {
      const normalizedPhoneLocal = phoneLocal.replace(/[^\d]/g, "");
      await createDemoEnquiry.mutateAsync({
        companyName,
        phoneNumber: normalizedPhoneLocal,
        message: message.trim() || undefined,
      });

      toast.success(t("landing.hero.bookDemoModal.submitSuccess"));
      setCompanyName("");
      setPhoneLocal("");
      setMessage("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(
        e?.message || t("landing.hero.bookDemoModal.submitError") || "Failed"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("landing.hero.bookDemoModal.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {t("landing.hero.bookDemoModal.companyName")}
            </label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t("landing.hero.bookDemoModal.companyNamePlaceholder")}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              {t("landing.hero.bookDemoModal.phoneNumber")}
            </label>
            <div className="flex items-center gap-2">
              <div className="h-10 px-3 inline-flex items-center rounded-md border border-input bg-background text-sm text-muted-foreground">
                +977
              </div>
              <Input
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value)}
                placeholder={t("landing.hero.bookDemoModal.phonePlaceholder")}
                inputMode="numeric"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("landing.hero.bookDemoModal.phoneHelp")}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              {t("landing.hero.bookDemoModal.message")}
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("landing.hero.bookDemoModal.messagePlaceholder")}
              rows={4}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createDemoEnquiry.isPending
                ? t("landing.hero.bookDemoModal.submitting")
                : t("landing.hero.bookDemoModal.submitBtn")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

