"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, Lock, Pencil, Phone, Plus, ShieldCheck, UserRound, Users } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import type { StaffPermission } from "@/common/store/store";
import { useAuthStore } from "@/common/store/store";
import {
  type StaffAccessUser,
  useCreateStaffAccessUser,
  useStaffAccessUsers,
  useUpdateStaffAccessUser,
} from "@/fetchers/staff/staffAccessQueries";
import { toast } from "sonner";

type StaffModule = "dealer" | "hatchery" | "farmer" | "company";

type PermissionOption = {
  permission: StaffPermission;
  label: string;
  description: string;
};

const STAFF_ACCESS_MODULES: Record<StaffModule, {
  businessLabel: string;
  permissions: PermissionOption[];
  defaultPermissions: StaffPermission[];
  staffDescription: string;
  permissionDescription?: string;
}> = {
  dealer: {
    businessLabel: "Feed Dealer",
    staffDescription: "Payroll staff records are managed elsewhere.",
    defaultPermissions: [],
    permissions: [
      { permission: "DEALER_VIEW_FINANCIAL_SUMMARIES", label: "Financial summaries", description: "Dashboard totals and Analytics" },
      { permission: "DEALER_VIEW_CASH_HISTORY", label: "Cash in hand", description: "Today’s cash and cash history" },
      { permission: "DEALER_VIEW_STAFF_MANAGEMENT", label: "Staff salary management", description: "View and manage payroll staff records" },
    ],
  },
  hatchery: {
    businessLabel: "Hatchery",
    staffDescription: "Payroll staff records are managed elsewhere.",
    defaultPermissions: ["HATCHERY_MANAGE_OPERATIONS"],
    permissionDescription: "Hatchery operations access is included with every staff login. Choose any additional areas this staff member needs.",
    permissions: [
      { permission: "HATCHERY_VIEW_ANALYTICS", label: "Analytics", description: "Hatchery dashboard and analytics data" },
      { permission: "HATCHERY_VIEW_STAFF_MANAGEMENT", label: "Staff salary management", description: "View and manage payroll staff records" },
    ],
  },
  farmer: {
    businessLabel: "Farmer",
    staffDescription: "Payroll staff records are managed elsewhere.",
    defaultPermissions: ["FARMER_MANAGE_OPERATIONS"],
    permissionDescription: "Farm operations access is included with every staff login. Choose any additional areas this staff member needs.",
    permissions: [
      { permission: "FARMER_VIEW_FINANCIAL_SUMMARIES", label: "Financial summaries", description: "Private dashboard totals, balances, and financial summaries" },
      { permission: "FARMER_VIEW_CASH_HISTORY", label: "Cash in hand", description: "Today’s cash book and cash history" },
      { permission: "FARMER_VIEW_ANALYTICS", label: "Analytics", description: "Farmer reports and operational analytics" },
      { permission: "FARMER_VIEW_STAFF_MANAGEMENT", label: "Staff salary management", description: "View and manage payroll staff records" },
    ],
  },
  company: {
    businessLabel: "Company",
    staffDescription: "Use Staff management to track payroll and salary records.",
    defaultPermissions: ["COMPANY_MANAGE_OPERATIONS"],
    permissionDescription: "Company operations access is included with every staff login. Choose any additional areas this staff member needs.",
    permissions: [
      { permission: "COMPANY_VIEW_FINANCIAL_SUMMARIES", label: "Financial summaries", description: "Private aggregate dashboard and ledger totals" },
      { permission: "COMPANY_VIEW_ANALYTICS", label: "Analytics", description: "Company reports and performance analytics" },
      { permission: "COMPANY_VIEW_STAFF_MANAGEMENT", label: "Staff salary management", description: "View and manage payroll staff records" },
    ],
  },
};

/** Phone box input: digits only, at most 10 (98XXXXXXXX). */
function phoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

/** Saved phones look like +9779812345678; the box shows the 10 local digits. */
function localPhone(value: string) {
  return value.replace(/\D/g, "").replace(/^977/, "").slice(0, 10);
}

function normalizedPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^977/, "");
  return digits.length === 10 ? `+977${digits}` : value;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

/** On/off switch drawn on a native checkbox, so forms and keyboards still work. */
function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span className="relative inline-flex shrink-0 items-center">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden
        className="h-5 w-9 rounded-full border border-gray-400 bg-gray-300 transition-colors peer-checked:border-green-700 peer-checked:bg-green-600 peer-focus-visible:ring-2 peer-focus-visible:ring-green-600 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-[3px] h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform peer-checked:translate-x-4"
      />
    </span>
  );
}

function PermissionRow({
  option,
  checked,
  onChange,
}: {
  option: PermissionOption;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{option.label}</span>
        <span className="block text-xs text-muted-foreground">{option.description}</span>
      </span>
      <ToggleSwitch checked={checked} onChange={onChange} label={option.label} />
    </label>
  );
}

export function StaffAccessPage({ module }: { module: StaffModule }) {
  const config = STAFF_ACCESS_MODULES[module];
  const user = useAuthStore((state) => state.user);
  const { data: staff = [], isLoading } = useStaffAccessUsers({ enabled: Boolean(user && !user.isStaff) });
  const create = useCreateStaffAccessUser();
  const update = useUpdateStaffAccessUser();
  const [form, setForm] = useState({ name: "", phone: "", password: "", permissions: config.defaultPermissions });
  const [credentials, setCredentials] = useState<Record<string, { phone?: string; password?: string }>>({});
  const [editingMember, setEditingMember] = useState<StaffAccessUser | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user?.isStaff) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </span>
          <h1 className="text-lg font-semibold">Owner access required</h1>
          <p className="text-sm text-muted-foreground">Only the {config.businessLabel} owner can manage staff login accounts.</p>
        </CardContent>
      </Card>
    );
  }

  const setPermission = (permission: StaffPermission, enabled: boolean) => {
    setForm((current) => ({
      ...current,
      permissions: enabled
        ? [...new Set([...current.permissions, permission])]
        : current.permissions.filter((item) => item !== permission),
    }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await create.mutateAsync({ ...form, phone: normalizedPhone(form.phone) });
      setForm({ name: "", phone: "", password: "", permissions: config.defaultPermissions });
      setShowPassword(false);
      setIsAddOpen(false);
      toast.success("Staff login account created");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not create staff account");
    }
  };
  const updatePermissions = async (member: StaffAccessUser, permission: StaffPermission, enabled: boolean) => {
    const permissions = enabled
      ? [...new Set([...member.permissions, permission])]
      : member.permissions.filter((item) => item !== permission);
    try { await update.mutateAsync({ id: member.id, permissions }); toast.success("Permissions updated"); }
    catch { toast.error("Could not update permissions"); }
  };
  const saveCredentials = async (id: string) => {
    const change = credentials[id];
    if (!change?.phone && !change?.password) return;
    if (change.phone && change.phone.length !== 10) {
      toast.error("Phone number must be 10 digits");
      return;
    }
    try {
      await update.mutateAsync({ id, ...(change.phone ? { phone: normalizedPhone(change.phone) } : {}), ...(change.password ? { password: change.password } : {}) });
      setCredentials((current) => ({ ...current, [id]: {} }));
      setEditingMember(null);
      toast.success("Staff credentials updated");
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not update staff credentials"); }
  };

  const activeCount = staff.filter((member) => member.isActive).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Staff access</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Give your {config.businessLabel} staff their own login. {config.staffDescription}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add staff login
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Staff logins</p>
          <p className="mt-1 text-2xl font-semibold">{isLoading ? "…" : staff.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-semibold text-primary">{isLoading ? "…" : activeCount}</p>
        </div>
      </div>

      {/* Staff list */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((key) => (
            <div key={key} className="h-48 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </span>
            <div>
              <p className="font-medium">No staff logins yet</p>
              <p className="text-sm text-muted-foreground">Add a login so your staff can work without your password.</p>
            </div>
            <Button variant="outline" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add staff login
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {staff.map((member) => (
            <Card key={member.id} className={member.isActive ? "" : "opacity-75"}>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(member.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{member.name}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {member.phone}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      member.isActive ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {member.isActive ? "Active" : "Turned off"}
                  </span>
                </div>

                <div className="rounded-lg border">
                  <p className="flex items-center gap-1.5 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Can see
                  </p>
                  <div className="divide-y">
                    {config.permissions.map((option) => (
                      <PermissionRow
                        key={option.permission}
                        option={option}
                        checked={member.permissions.includes(option.permission)}
                        onChange={(enabled) => updatePermissions(member, option.permission, enabled)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <ToggleSwitch
                      checked={member.isActive}
                      onChange={(checked) => update.mutate({ id: member.id, isActive: checked })}
                      label={`Login active for ${member.name}`}
                    />
                    Login active
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCredentials((current) => ({ ...current, [member.id]: { phone: localPhone(member.phone), password: "" } }));
                      setEditingMember(member);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit login
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add staff dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" />
              Add staff login
            </DialogTitle>
            <DialogDescription>
              {config.permissionDescription ?? "Choose exactly the business areas this staff member needs."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-staff-name">Name</Label>
              <Input id="new-staff-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-staff-phone">Phone (login ID)</Label>
                <Input id="new-staff-phone" required inputMode="numeric" maxLength={10} pattern="\d{10}" title="Enter a 10-digit phone number" placeholder="98XXXXXXXX" value={form.phone} onChange={(event) => setForm({ ...form, phone: phoneDigits(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-staff-password">Password</Label>
                <div className="relative">
                  <Input
                    id="new-staff-password"
                    required
                    minLength={8}
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    className="pr-10"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>What they can see</Label>
              <div className="divide-y rounded-lg border">
                {config.permissions.map((option) => (
                  <PermissionRow
                    key={option.permission}
                    option={option}
                    checked={form.permissions.includes(option.permission)}
                    onChange={(enabled) => setPermission(option.permission, enabled)}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create staff login"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit login dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit staff login</DialogTitle>
            <DialogDescription>Change the phone login ID, or set a new password only when needed.</DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="staff-phone">Phone (login ID)</Label>
                <Input id="staff-phone" inputMode="numeric" maxLength={10} placeholder="98XXXXXXXX" value={credentials[editingMember.id]?.phone ?? ""} onChange={(event) => setCredentials((current) => ({ ...current, [editingMember.id]: { ...current[editingMember.id], phone: phoneDigits(event.target.value) } }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password">New password</Label>
                <Input id="staff-password" minLength={8} type="password" placeholder="Leave blank to keep the current password" value={credentials[editingMember.id]?.password ?? ""} onChange={(event) => setCredentials((current) => ({ ...current, [editingMember.id]: { ...current[editingMember.id], password: event.target.value } }))} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button disabled={update.isPending} onClick={() => editingMember && saveCredentials(editingMember.id)}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
