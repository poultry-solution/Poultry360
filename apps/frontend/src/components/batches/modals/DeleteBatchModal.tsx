"use client";

import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface DeleteBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Form state
  deletePassword: string;
  setDeletePassword: (password: string) => void;
  
  // Handlers
  onDelete: () => Promise<void>;
  
  // Loading
  isDeleting: boolean;
}

export function DeleteBatchModal({
  isOpen,
  onClose,
  deletePassword,
  setDeletePassword,
  onDelete,
  isDeleting,
}: DeleteBatchModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Batch"
    >
      <ModalContent>
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This will attempt to roll back initial
              chick usage and permanently delete this batch. This action
              cannot be undone.
            </p>
          </div>
          <div>
            <Label htmlFor="delpass">Confirm with your password</Label>
            <Input
              id="delpass"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1"
            />
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white"
          disabled={isDeleting || !deletePassword}
          onClick={onDelete}
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
            </>
          ) : (
            "Confirm Delete"
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
