"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { useChangeStaffPassword } from "@/fetchers/staff/staffAuthQueries";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Voluntary self-change dialog from the topbar user menu. Always requires the
// current password (unlike the first-login flow, which skips it).
export function StaffChangePasswordDialog({ open, onOpenChange }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = useChangeStaffPassword();

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setError(null);
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Could not change password");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Enter your current password and the new password you want to use.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="staff-current-password">Current password</Label>
            <Input
              id="staff-current-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={change.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-new-password-topbar">New password</Label>
            <div className="relative">
              <Input
                id="staff-new-password-topbar"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                disabled={change.isPending}
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
            <Label htmlFor="staff-confirm-password-topbar">Confirm new password</Label>
            <Input
              id="staff-confirm-password-topbar"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={change.isPending}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={change.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? "Saving…" : "Change password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
