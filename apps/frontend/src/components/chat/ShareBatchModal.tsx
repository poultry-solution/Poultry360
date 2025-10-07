"use client";

import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import React from "react";

export type BatchFilter = "ALL" | "ACTIVE" | "COMPLETED";

export interface ShareBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Data
  filteredBatches: Array<{
    id: string;
    batchNumber?: string;
    startDate?: string | Date;
    status?: string;
    farm?: { name?: string };
  }>;
  // Selection & filters
  selectedBatchId: string;
  setSelectedBatchId: (id: string) => void;
  batchFilter: BatchFilter;
  setBatchFilter: (f: BatchFilter) => void;
  batchSearch: string;
  setBatchSearch: (v: string) => void;
  // Form fields
  shareTitle: string;
  setShareTitle: (v: string) => void;
  shareNote: string;
  setShareNote: (v: string) => void;
  expiresIn: "never" | "1d" | "7d" | "30d";
  setExpiresIn: (v: "never" | "1d" | "7d" | "30d") => void;
  // Actions
  isSubmitting?: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function ShareBatchModal(props: ShareBatchModalProps) {
  const {
    isOpen,
    onClose,
    filteredBatches,
    selectedBatchId,
    setSelectedBatchId,
    batchFilter,
    setBatchFilter,
    batchSearch,
    setBatchSearch,
    shareTitle,
    setShareTitle,
    shareNote,
    setShareNote,
    expiresIn,
    setExpiresIn,
    isSubmitting,
    onSubmit,
  } = props;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Batch Data">
      <form onSubmit={onSubmit}>
        <ModalContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Select Batch</Label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  className={`px-2 py-1 rounded ${batchFilter === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  onClick={() => setBatchFilter("ALL")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded ${batchFilter === "ACTIVE" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  onClick={() => setBatchFilter("ACTIVE")}
                >
                  Active
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded ${batchFilter === "COMPLETED" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  onClick={() => setBatchFilter("COMPLETED")}
                >
                  Completed
                </button>
              </div>
            </div>

            <div className="relative">
              <Input
                placeholder="Search batches..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className="pl-8"
              />
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="max-h-64 overflow-auto border rounded-md">
              {filteredBatches.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No batches found
                </div>
              ) : (
                filteredBatches.map((b) => (
                  <label
                    key={b.id}
                    className={`flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer ${selectedBatchId === b.id ? "bg-primary/5" : "hover:bg-muted"}`}
                  >
                    <div>
                      <div className="font-medium text-sm">{b.batchNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.farm?.name} • {new Date(b.startDate || "").toLocaleDateString()} • {b.status}
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="batch"
                      checked={selectedBatchId === b.id}
                      onChange={() => setSelectedBatchId(b.id)}
                    />
                  </label>
                ))
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Title (optional)</Label>
                <Input
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="e.g., Week 5 health check"
                />
              </div>
              <div>
                <Label className="text-sm">Expires In</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value as any)}
                >
                  <option value="never">Never</option>
                  <option value="1d">1 day</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-sm">Note (optional)</Label>
              <Input
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                placeholder="Add context for the doctor"
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-primary" disabled={isSubmitting || !selectedBatchId}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sharing...
              </>
            ) : (
              "Share"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default ShareBatchModal;


