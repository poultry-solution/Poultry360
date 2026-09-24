"use client";

import { FormEvent, useState } from "react";
import { Pencil, Plus, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
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
    permissions: [
      { permission: "FARMER_MANAGE_OPERATIONS", label: "Farm operations", description: "Farms, Broiler and Layer batches, inventory, suppliers, customers, sales, expenses, and daily production" },
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

function normalizedPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^977/, "");
  return digits.length === 10 ? `+977${digits}` : value;
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

  if (user?.isStaff) {
    return <Card><CardHeader><CardTitle>Owner access required</CardTitle><CardDescription>Only the {config.businessLabel} owner can manage staff login accounts.</CardDescription></CardHeader></Card>;
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
    try {
      await update.mutateAsync({ id, ...(change.phone ? { phone: normalizedPhone(change.phone) } : {}), ...(change.password ? { password: change.password } : {}) });
      setCredentials((current) => ({ ...current, [id]: {} }));
      setEditingMember(null);
      toast.success("Staff credentials updated");
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not update staff credentials"); }
  };

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-bold">Staff access</h1><p className="text-sm text-muted-foreground">Create separate login accounts for your {config.businessLabel} staff. {config.staffDescription}</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add staff login</CardTitle><CardDescription>{config.permissionDescription ?? "Choose exactly the business areas this staff member needs."}</CardDescription></CardHeader>
      <CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <div><Label>Name</Label><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
        <div><Label>Phone login ID</Label><Input required inputMode="numeric" placeholder="98XXXXXXXX" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
        <div><Label>Initial password</Label><Input required minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div>
        <div className="space-y-3 rounded-md border p-3">
          {config.permissions.map((option) => <label key={option.permission} className="flex items-center justify-between gap-3 text-sm"><span><b>{option.label}</b><br /><span className="text-muted-foreground">{option.description}</span></span><input type="checkbox" checked={form.permissions.includes(option.permission)} onChange={(event) => setPermission(option.permission, event.target.checked)} /></label>)}
        </div>
        <Button className="md:col-span-2" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create staff login"}</Button>
      </form></CardContent>
    </Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" /> Staff login accounts</CardTitle></CardHeader><CardContent className="space-y-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Loading staff accounts…</p> : staff.length === 0 ? <p className="text-sm text-muted-foreground">No staff login accounts yet.</p> : staff.map((member) => <div key={member.id} className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{member.name}</p><p className="text-sm text-muted-foreground">{member.phone}</p></div><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm">Active <input type="checkbox" checked={member.isActive} onChange={(event) => update.mutate({ id: member.id, isActive: event.target.checked })} /></label><Button size="sm" variant="outline" onClick={() => { setCredentials((current) => ({ ...current, [member.id]: { phone: member.phone, password: "" } })); setEditingMember(member); }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button></div></div>
        <div className="mt-4 flex flex-wrap gap-5">{config.permissions.map((option) => <label key={option.permission} className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" /> {option.label} <input type="checkbox" checked={member.permissions.includes(option.permission)} onChange={(event) => updatePermissions(member, option.permission, event.target.checked)} /></label>)}</div>
      </div>)}
    </CardContent></Card>
    <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}><DialogContent><DialogHeader><DialogTitle>Edit staff login</DialogTitle><DialogDescription>Update this staff member’s phone login ID or reset their password only when needed.</DialogDescription></DialogHeader>
      {editingMember && <div className="space-y-4 py-2"><div className="space-y-2"><Label htmlFor="staff-phone">Phone login ID</Label><Input id="staff-phone" inputMode="numeric" value={credentials[editingMember.id]?.phone ?? ""} onChange={(event) => setCredentials((current) => ({ ...current, [editingMember.id]: { ...current[editingMember.id], phone: event.target.value } }))} /></div><div className="space-y-2"><Label htmlFor="staff-password">New password</Label><Input id="staff-password" minLength={8} type="password" placeholder="Leave blank to keep the current password" value={credentials[editingMember.id]?.password ?? ""} onChange={(event) => setCredentials((current) => ({ ...current, [editingMember.id]: { ...current[editingMember.id], password: event.target.value } }))} /></div></div>}
      <DialogFooter><Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button><Button disabled={update.isPending} onClick={() => editingMember && saveCredentials(editingMember.id)}>Save changes</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
