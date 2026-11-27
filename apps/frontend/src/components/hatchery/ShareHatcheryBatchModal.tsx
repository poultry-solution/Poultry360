"use client";

import { useState } from "react";
import { Check, Copy, Link2, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { DateDisplay } from "@/common/components/ui/date-display";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import {
  hatcheryShareUrl,
  useCreateHatcheryShareLink,
  useGetHatcheryShareLinks,
  useRevokeHatcheryShareLink,
  type HatcheryShareLink,
  type HatcheryShareLinkDays,
} from "@/fetchers/hatchery/hatcheryShareQueries";

interface ShareHatcheryBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  batchCode: string;
}

const DAY_OPTIONS: HatcheryShareLinkDays[] = [1, 7, 30];

/** Share a parent batch report (no money) with a vet. Same flow as the farmer share. */
export function ShareHatcheryBatchModal({ isOpen, onClose, batchId, batchCode }: ShareHatcheryBatchModalProps) {
  const [days, setDays] = useState<HatcheryShareLinkDays>(7);
  const [showNotes, setShowNotes] = useState(false);
  const [newLink, setNewLink] = useState<HatcheryShareLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: links = [], isLoading } = useGetHatcheryShareLinks(batchId, isOpen);
  const createLink = useCreateHatcheryShareLink(batchId);
  const revokeLink = useRevokeHatcheryShareLink(batchId);

  const close = () => {
    setNewLink(null);
    onClose();
  };

  const message = (link: HatcheryShareLink) =>
    `Batch report for ${batchCode} (eggs, deaths, feed, medicine and hatching): ${hatcheryShareUrl(link.token)}`;

  const copy = async (link: HatcheryShareLink) => {
    try {
      await navigator.clipboard.writeText(hatcheryShareUrl(link.token));
      setCopiedId(link.id);
      toast.success("Link copied");
      setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 2000);
    } catch {
      toast.error("Could not copy. Please copy the link by hand.");
    }
  };

  const shareOnWhatsApp = (link: HatcheryShareLink) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message(link))}`, "_blank", "noopener,noreferrer");
  };

  const canUsePhoneShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const phoneShare = async (link: HatcheryShareLink) => {
    try {
      await navigator.share({ title: `Batch ${batchCode}`, text: message(link) });
    } catch {
      // The person closed the share menu; nothing to do.
    }
  };

  const create = async () => {
    try {
      const link = await createLink.mutateAsync({ expiresInDays: days, showNotes });
      setNewLink(link);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not make the link. Please try again.");
    }
  };

  const revoke = async (link: HatcheryShareLink) => {
    try {
      await revokeLink.mutateAsync(link.id);
      if (newLink?.id === link.id) setNewLink(null);
      toast.success("Link turned off");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not turn off the link. Please try again.");
    }
  };

  const shareButtons = (link: HatcheryShareLink) => (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5b]" onClick={() => shareOnWhatsApp(link)}>
        <Share2 className="mr-1.5 h-4 w-4" />
        WhatsApp
      </Button>
      <Button size="sm" variant="outline" onClick={() => copy(link)}>
        {copiedId === link.id ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
        {copiedId === link.id ? "Copied" : "Copy link"}
      </Button>
      {canUsePhoneShare && (
        <Button size="sm" variant="outline" onClick={() => phoneShare(link)}>
          More
        </Button>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={close} title={`Share batch ${batchCode}`}>
      <ModalContent>
        <div className="space-y-5 text-sm">
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">
            Send this to your vet. They see birds, deaths, eggs, feed, medicine and hatching for this batch and its
            incubations. They don&apos;t see any money, prices, customers or suppliers.
          </p>

          {newLink ? (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="font-medium">Your link is ready</p>
              <p className="break-all rounded bg-muted px-2 py-1.5 font-mono text-xs">{hatcheryShareUrl(newLink.token)}</p>
              {shareButtons(newLink)}
              <Button size="sm" variant="ghost" className="px-0" onClick={() => setNewLink(null)}>
                Make another link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium">How long should the link work?</p>
                <div className="flex gap-2">
                  {DAY_OPTIONS.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      size="sm"
                      variant={days === option ? "default" : "outline"}
                      onClick={() => setDays(option)}
                    >
                      {option === 1 ? "1 day" : `${option} days`}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={showNotes}
                  onChange={(event) => setShowNotes(event.target.checked)}
                />
                <span>
                  Show notes
                  <span className="block text-xs text-muted-foreground">
                    Notes you wrote on this batch and its incubations.
                  </span>
                </span>
              </label>
              <Button onClick={create} disabled={createLink.isPending}>
                {createLink.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-1.5 h-4 w-4" />
                )}
                Make link
              </Button>
            </div>
          )}

          <div className="space-y-2 border-t pt-4">
            <p className="font-medium">Open links</p>
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : links.length === 0 ? (
              <p className="text-muted-foreground">No open links.</p>
            ) : (
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        <span>
                          Ends on <DateDisplay date={link.expiresAt} />
                        </span>
                        <span className="mx-1.5">·</span>
                        <span>{link.viewCount === 1 ? "Opened 1 time" : `Opened ${link.viewCount} times`}</span>
                        {link.showNotes && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span>With notes</span>
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
                        Turn off
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
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
