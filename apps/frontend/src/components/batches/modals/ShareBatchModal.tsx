"use client";

import { useState } from "react";
import { Check, Copy, Link2, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { DateDisplay } from "@/common/components/ui/date-display";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import {
  shareLinkUrl,
  useCreateBatchShareLink,
  useGetBatchShareLinks,
  useRevokeBatchShareLink,
  type BatchShareLink,
  type ShareLinkDays,
} from "@/fetchers/batchShare/batchShareQueries";
import { useI18n } from "@/i18n/useI18n";

interface ShareBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  batchName: string;
}

const DAY_OPTIONS: ShareLinkDays[] = [1, 7, 30];

export function ShareBatchModal({ isOpen, onClose, batchId, batchName }: ShareBatchModalProps) {
  const { t } = useI18n();
  const [days, setDays] = useState<ShareLinkDays>(7);
  const [showLocation, setShowLocation] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [newLink, setNewLink] = useState<BatchShareLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: links = [], isLoading } = useGetBatchShareLinks(batchId, isOpen);
  const createLink = useCreateBatchShareLink(batchId);
  const revokeLink = useRevokeBatchShareLink(batchId);

  const close = () => {
    setNewLink(null);
    onClose();
  };

  const message = (link: BatchShareLink) =>
    t("batchShare.modal.whatsappText", { batch: batchName, url: shareLinkUrl(link.token) });

  const copy = async (link: BatchShareLink) => {
    try {
      await navigator.clipboard.writeText(shareLinkUrl(link.token));
      setCopiedId(link.id);
      toast.success(t("batchShare.modal.copied"));
      setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 2000);
    } catch {
      toast.error(t("batchShare.modal.copyFailed"));
    }
  };

  const shareOnWhatsApp = (link: BatchShareLink) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message(link))}`, "_blank", "noopener,noreferrer");
  };

  const canUsePhoneShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const phoneShare = async (link: BatchShareLink) => {
    try {
      await navigator.share({ title: batchName, text: message(link) });
    } catch {
      // The person closed the share menu; nothing to do.
    }
  };

  const create = async () => {
    try {
      const link = await createLink.mutateAsync({ expiresInDays: days, showLocation, showNotes });
      setNewLink(link);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("batchShare.modal.createFailed"));
    }
  };

  const revoke = async (link: BatchShareLink) => {
    try {
      await revokeLink.mutateAsync(link.id);
      if (newLink?.id === link.id) setNewLink(null);
      toast.success(t("batchShare.modal.turnedOff"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("batchShare.modal.turnOffFailed"));
    }
  };

  const shareButtons = (link: BatchShareLink) => (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5b]" onClick={() => shareOnWhatsApp(link)}>
        <Share2 className="mr-1.5 h-4 w-4" />
        {t("batchShare.modal.whatsapp")}
      </Button>
      <Button size="sm" variant="outline" onClick={() => copy(link)}>
        {copiedId === link.id ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
        {copiedId === link.id ? t("batchShare.modal.copiedShort") : t("batchShare.modal.copy")}
      </Button>
      {canUsePhoneShare && (
        <Button size="sm" variant="outline" onClick={() => phoneShare(link)}>
          {t("batchShare.modal.more")}
        </Button>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={close} title={t("batchShare.modal.title")}>
      <ModalContent>
        <div className="space-y-5 text-sm">
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">{t("batchShare.modal.whatTheySee")}</p>

          {newLink ? (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="font-medium">{t("batchShare.modal.linkReady")}</p>
              <p className="break-all rounded bg-muted px-2 py-1.5 font-mono text-xs">{shareLinkUrl(newLink.token)}</p>
              {shareButtons(newLink)}
              <Button size="sm" variant="ghost" className="px-0" onClick={() => setNewLink(null)}>
                {t("batchShare.modal.makeAnother")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium">{t("batchShare.modal.howLong")}</p>
                <div className="flex gap-2">
                  {DAY_OPTIONS.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      size="sm"
                      variant={days === option ? "default" : "outline"}
                      onClick={() => setDays(option)}
                    >
                      {t(option === 1 ? "batchShare.modal.oneDay" : "batchShare.modal.days", { n: option })}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={showLocation}
                  onChange={(event) => setShowLocation(event.target.checked)}
                />
                <span>
                  {t("batchShare.modal.showLocation")}
                  <span className="block text-xs text-muted-foreground">{t("batchShare.modal.showLocationHint")}</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={showNotes}
                  onChange={(event) => setShowNotes(event.target.checked)}
                />
                <span>
                  {t("batchShare.modal.showNotes")}
                  <span className="block text-xs text-muted-foreground">{t("batchShare.modal.showNotesHint")}</span>
                </span>
              </label>
              <Button onClick={create} disabled={createLink.isPending}>
                {createLink.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Link2 className="mr-1.5 h-4 w-4" />}
                {t("batchShare.modal.create")}
              </Button>
            </div>
          )}

          <div className="space-y-2 border-t pt-4">
            <p className="font-medium">{t("batchShare.modal.openLinks")}</p>
            {isLoading ? (
              <p className="text-muted-foreground">{t("batchShare.modal.loading")}</p>
            ) : links.length === 0 ? (
              <p className="text-muted-foreground">{t("batchShare.modal.noLinks")}</p>
            ) : (
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        <span>
                          {t("batchShare.modal.endsOn")} <DateDisplay date={link.expiresAt} />
                        </span>
                        <span className="mx-1.5">·</span>
                        <span>{t("batchShare.modal.opened", { n: link.viewCount })}</span>
                        {(link.showLocation || link.showNotes) && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span>
                              {[
                                link.showLocation ? t("batchShare.modal.withLocation") : null,
                                link.showNotes ? t("batchShare.modal.withNotes") : null,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={revokeLink.isPending}
                        onClick={() => revoke(link)}
                      >
                        {t("batchShare.modal.turnOff")}
                      </Button>
                    </div>
                    {shareButtons(link)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="outline" onClick={close}>
          {t("batchShare.modal.close")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
