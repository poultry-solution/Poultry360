"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Pencil, Plus, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/common/components/ui/dialog";
import { useAuthStore, type StaffPermission } from "@/common/store/store";
import { type StaffAccessUser, useCreateStaffAccessUser, useStaffAccessUsers, useUpdateStaffAccessUser } from "@/fetchers/dealer/staffAccessQueries";
import { toast } from "sonner";

const FINANCIAL: StaffPermission = "DEALER_VIEW_FINANCIAL_SUMMARIES";
// This existing permission controls the whole Cash in hand feature for staff,
// including today's cash and its history.
const CASH_IN_HAND: StaffPermission = "DEALER_VIEW_CASH_HISTORY";
const STAFF_MANAGEMENT: StaffPermission = "DEALER_VIEW_STAFF_MANAGEMENT";

function normalizedPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^977/, "");
  return digits.length === 10 ? `+977${digits}` : value;
}

export default function StaffAccessPage() {
  const user = useAuthStore((state) => state.user);
  const { data: staff = [], isLoading } = useStaffAccessUsers({ enabled: !user?.isStaff });
  const create = useCreateStaffAccessUser();
  const update = useUpdateStaffAccessUser();
  const [form, setForm] = useState({ name: "", phone: "", password: "", financial: false, cashInHand: false, staffManagement: false });
  const [credentials, setCredentials] = useState<Record<string, { phone?: string; password?: string }>>({});
  const [editingMember, setEditingMember] = useState<StaffAccessUser | null>(null);

  if (user?.isStaff) {
    return <Card><CardHeader><CardTitle>Owner access required</CardTitle><CardDescription>Only the Feed Dealer owner can manage staff login accounts.</CardDescription></CardHeader></Card>;
  }

  const permissions = (financial: boolean, cashInHand: boolean, staffManagement: boolean) => [
    ...(financial ? [FINANCIAL] : []),
    ...(cashInHand ? [CASH_IN_HAND] : []),
    ...(staffManagement ? [STAFF_MANAGEMENT] : []),
  ];
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await create.mutateAsync({ ...form, phone: normalizedPhone(form.phone), permissions: permissions(form.financial, form.cashInHand, form.staffManagement) });
      setForm({ name: "", phone: "", password: "", financial: false, cashInHand: false, staffManagement: false });
      toast.success("Staff login account created");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not create staff account");
    }
  };
  const updatePermissions = async (id: string, current: StaffPermission[], permission: StaffPermission, enabled: boolean) => {
    const next = enabled ? [...new Set([...current, permission])] : current.filter((value) => value !== permission);
    try { await update.mutateAsync({ id, permissions: next }); toast.success("Permissions updated"); }
    catch { toast.error("Could not update permissions"); }
  };
  const saveCredentials = async (id: string) => {
    const change = credentials[id];
    if (!change?.phone && !change?.password) return;
    try {
      await update.mutateAsync({
        id,
        ...(change.phone ? { phone: normalizedPhone(change.phone) } : {}),
        ...(change.password ? { password: change.password } : {}),
      });
      setCredentials((current) => ({ ...current, [id]: {} }));
      setEditingMember(null);
      toast.success("Staff credentials updated");
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not update staff credentials"); }
  };

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-bold">Staff access</h1><p className="text-sm text-muted-foreground">Create separate login accounts for your Feed Dealer staff. Payroll staff records are managed elsewhere.</p></div>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add staff login</CardTitle><CardDescription>Staff start with normal work only. Cash in hand is hidden unless you turn it on.</CardDescription></CardHeader>
      <CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Phone login ID</Label><Input required inputMode="numeric" placeholder="98XXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>Initial password</Label><Input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div className="space-y-3 rounded-md border p-3">
          <label className="flex items-center justify-between gap-3 text-sm"><span><b>Financial summaries</b><br /><span className="text-muted-foreground">Dashboard totals and Analytics</span></span><input type="checkbox" checked={form.financial} onChange={(event) => setForm({ ...form, financial: event.target.checked })} /></label>
          <label className="flex items-center justify-between gap-3 text-sm"><span><b>Cash in hand</b><br /><span className="text-muted-foreground">Today’s cash and cash history</span></span><input type="checkbox" checked={form.cashInHand} onChange={(event) => setForm({ ...form, cashInHand: event.target.checked })} /></label>
          <label className="flex items-center justify-between gap-3 text-sm"><span><b>Staff salary management</b><br /><span className="text-muted-foreground">View and manage payroll staff records</span></span><input type="checkbox" checked={form.staffManagement} onChange={(event) => setForm({ ...form, staffManagement: event.target.checked })} /></label>
        </div>
        <Button className="md:col-span-2" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create staff login"}</Button>
      </form></CardContent>
    </Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" /> Staff login accounts</CardTitle></CardHeader><CardContent className="space-y-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Loading staff accounts…</p> : staff.length === 0 ? <p className="text-sm text-muted-foreground">No staff login accounts yet.</p> : staff.map((member) => <div key={member.id} className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{member.name}</p><p className="text-sm text-muted-foreground">{member.phone}</p></div><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm">Active <input type="checkbox" checked={member.isActive} onChange={(event) => update.mutate({ id: member.id, isActive: event.target.checked })} /></label><Button size="sm" variant="outline" onClick={() => { setCredentials((current) => ({ ...current, [member.id]: { phone: member.phone, password: "" } })); setEditingMember(member); }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button></div></div>
        <div className="mt-4 flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" /> Financial summaries <input type="checkbox" checked={member.permissions.includes(FINANCIAL)} onChange={(event) => updatePermissions(member.id, member.permissions, FINANCIAL, event.target.checked)} /></label><label className="flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4" /> Cash in hand <input type="checkbox" checked={member.permissions.includes(CASH_IN_HAND)} onChange={(event) => updatePermissions(member.id, member.permissions, CASH_IN_HAND, event.target.checked)} /></label><label className="flex items-center gap-2 text-sm"><UserRound className="h-4 w-4" /> Staff salary management <input type="checkbox" checked={member.permissions.includes(STAFF_MANAGEMENT)} onChange={(event) => updatePermissions(member.id, member.permissions, STAFF_MANAGEMENT, event.target.checked)} /></label></div>
      </div>)}
    </CardContent></Card>
    <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit staff login</DialogTitle><DialogDescription>Update this staff member’s phone login ID or reset their password only when needed.</DialogDescription></DialogHeader>
        {editingMember && <div className="space-y-4 py-2">
          <div className="space-y-2"><Label htmlFor="staff-phone">Phone login ID</Label><Input id="staff-phone" inputMode="numeric" value={credentials[editingMember.id]?.phone ?? ""} onChange={(event) => setCredentials((current) => ({ ...current, [editingMember.id]: { ...current[editingMember.id], phone: event.target.value } }))} /></div>
          <div className="space-y-2"><Label htmlFor="staff-password">New password</Label><Input id="staff-password" minLength={8} type="password" placeholder="Leave blank to keep the current password" value={credentials[editingMember.id]?.password ?? ""} onChange={(event) => setCredentials((current) => ({ ...current, [editingMember.id]: { ...current[editingMember.id], password: event.target.value } }))} /></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button><Button disabled={update.isPending} onClick={() => editingMember && saveCredentials(editingMember.id)}>Save changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
