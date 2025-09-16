"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { getTodayLocalDate, formatMoneyINR } from "@/lib/utils";
import { LedgerEntry } from "@/types/shop";
import { Trash2, X, Plus } from "lucide-react";

interface LedgerListProps {
  entries: LedgerEntry[];
  onCreate: (e: LedgerEntry) => void;
  onDeleteMany: (ids: string[]) => void;
}

export function LedgerList({ entries, onCreate, onDeleteMany }: LedgerListProps) {
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    date: getTodayLocalDate(),
    description: "",
    debit: "",
    credit: "",
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e =>
      e.description.toLowerCase().includes(q) || (e.ref || "").toLowerCase().includes(q)
    );
  }, [entries, query]);

  function toggleAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(e => e.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleCreate() {
    const debit = Number(form.debit || 0);
    const credit = Number(form.credit || 0);
    const lastBalance = entries.at(-1)?.balanceAfter || 0;
    const balanceAfter = lastBalance + debit - credit;
    const newEntry: LedgerEntry = {
      id: Date.now().toString(),
      date: form.date,
      description: form.description || "Entry",
      debit,
      credit,
      balanceAfter,
    };
    onCreate(newEntry);
    setIsAddOpen(false);
    setForm({ date: getTodayLocalDate(), description: "", debit: "", credit: "" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search description or ref" />
        </div>
        <div className="flex gap-2">
          {isDeleteMode ? (
            <>
              <Button variant="outline" onClick={() => { setIsDeleteMode(false); setSelectedIds(new Set()); }}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={selectedIds.size === 0} onClick={() => setConfirmOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedIds.size})
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsDeleteMode(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Entries
              </Button>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Entry
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        <div className="grid grid-cols-6 px-3 py-2 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            {isDeleteMode && (
              <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filtered.length} onChange={toggleAll} />
            )}
            Date
          </div>
          <div>Description</div>
          <div>Ref</div>
          <div className="text-right">Debit</div>
          <div className="text-right">Credit</div>
          <div className="text-right">Balance</div>
        </div>
        {filtered.map((e) => (
          <div key={e.id} className="grid grid-cols-6 px-3 py-2 text-sm items-center">
            <div className="flex items-center gap-2">
              {isDeleteMode && (
                <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleOne(e.id)} />
              )}
              {e.date}
            </div>
            <div className="truncate">{e.description}</div>
            <div className="truncate">{e.ref || '-'}</div>
            <div className="text-right">{e.debit ? formatMoneyINR(e.debit) : '-'}</div>
            <div className="text-right">{e.credit ? formatMoneyINR(e.credit) : '-'}</div>
            <div className="text-right font-medium">{formatMoneyINR(e.balanceAfter)}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-sm text-muted-foreground">No entries.</div>
        )}
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title={`Delete ${selectedIds.size} entr${selectedIds.size === 1 ? 'y' : 'ies'}?`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { onDeleteMany(Array.from(selectedIds)); setConfirmOpen(false); setIsDeleteMode(false); setSelectedIds(new Set()); }}>Delete</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Ledger Entry">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="debit">Debit</Label>
              <Input id="debit" type="number" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="credit">Credit</Label>
              <Input id="credit" type="number" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

