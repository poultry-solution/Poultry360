"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { useUser } from "@/common/store/store";
import {
  useAcknowledgeStaffPassword,
  useChangeStaffPassword,
} from "@/fetchers/staff/staffAuthQueries";

// Non-dismissible modal shown to staff whose account was just created or whose
// password was just reset by the owner. The staff must either set their own
// password or explicitly keep the one the owner picked.
export function StaffPasswordPrompt() {
  const user = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = useChangeStaffPassword();
  const acknowledge = useAcknowledgeStaffPassword();

  const open = !!user?.isStaff && !!user?.mustChangePassword;
  if (!open) return null;

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setShowPassword(false);
  };

  const onSave = async () => {
    setError(null);
    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      reset();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Could not change password");
    }
  };

  const onKeep = async () => {
    setError(null);
    try {
      await acknowledge.mutateAsync();
      reset();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Could not continue");
    }
  };

  const busy = change.isPending || acknowledge.isPending;

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set your password</AlertDialogTitle>
          <AlertDialogDescription>
            Your account owner set an initial password for you. Pick your own
            now, or keep the one they shared with you.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="staff-current-password-prompt">Current password</Label>
            <Input
              id="staff-current-password-prompt"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-new-password">New password</Label>
            <div className="relative">
              <Input
                id="staff-new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                disabled={busy}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-confirm-password">Confirm new password</Label>
            <Input
              id="staff-confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={busy}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onKeep} disabled={busy}>
            Keep current password
          </Button>
          <Button onClick={onSave} disabled={busy || !currentPassword || !newPassword || !confirmPassword}>
            {change.isPending ? "Saving…" : "Save new password"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
