"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Layers,

  TrendingUp,
  DollarSign,
  CreditCard,
  Receipt,
  Plus,
  Clock,
} from "lucide-react";
import { useAuth } from "@/store/store";
import { useState } from "react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useInventory } from "@/contexts/InventoryContext";

export default function DashboardPage() {
  const { user } = useAuth();
  
  // Fetch batches for shortcuts
  const { data: batchesResponse } = useGetAllBatches();
  const activeBatches = batchesResponse?.data || [];
  
  // Inventory integration
  const { inventory, updateInventoryItem, getInventoryByCategory } = useInventory();
  const feedInventory = getInventoryByCategory("feed");
  const medicineInventory = getInventoryByCategory("medicine");
  
  const [isFarmsOpen, setIsFarmsOpen] = useState(false);
  const [isBatchesOpen, setIsBatchesOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isGiveOpen, setIsGiveOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  
  // Shortcut modals
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [isQuickLedgerOpen, setIsQuickLedgerOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: '',
    date: '',
    time: '',
    type: 'Task Reminder'
  });
  const [reminders, setReminders] = useState([
    { id: 1, title: 'Collect payment from Ram', date: '2025-09-10', time: '11:36 PM', type: 'Task Reminder' },
    { id: 2, title: 'Vaccination for Batch B-2024-001', date: '2025-09-12', time: '09:00 AM', type: 'Medical Reminder' }
  ]);

  // Quick form states
  const [quickExpenseForm, setQuickExpenseForm] = useState({
    batchId: "",
    category: "Feed",
    date: "",
    notes: "",
    feedBrand: "",
    feedQuantity: "",
    feedRate: "",
    selectedFeedId: "",
    hatcheryName: "",
    hatcheryRate: "",
    hatcheryQuantity: "",
    medicineName: "",
    medicineRate: "",
    medicineQuantity: "",
    selectedMedicineId: "",
    otherName: "",
    otherRate: "",
    otherQuantity: "",
  });

  const [quickSaleForm, setQuickSaleForm] = useState({
    batchId: "",
    item: "Chicken",
    rate: "",
    quantity: "",
    remaining: false,
    customerName: "",
    contact: "",
    category: "Chicken",
    balance: "",
    date: "",
  });

  const [quickLedgerForm, setQuickLedgerForm] = useState({
    batchId: "",
    name: "",
    contact: "",
    category: "Chicken",
    sales: "",
    received: "",
  });

  const [quickFormErrors, setQuickFormErrors] = useState<Record<string, string>>({});

  const farms = [
    { id: 1, name: "Farm A", location: "Bharatpur, Chitwan", capacity: 5000, activeBatches: 2, closedBatches: 5 },
    { id: 2, name: "Farm B", location: "Pokhara, Kaski", capacity: 3500, activeBatches: 1, closedBatches: 3 },
    { id: 3, name: "Farm C", location: "Butwal, Rupandehi", capacity: 4000, activeBatches: 2, closedBatches: 4 },
  ];

  const sampleBatches = [
    { id: 1, code: "B-2024-001", farm: "Farm A", birds: 2500, ageDays: 32, status: "Active" },
    { id: 2, code: "B-2024-002", farm: "Farm B", birds: 2000, ageDays: 27, status: "Active" },
    { id: 3, code: "B-2023-019", farm: "Farm C", birds: 2300, ageDays: 45, status: "Closed" },
  ];

  const receivables = [
    { id: 1, party: "Dealer A", reference: "Batch B-2024-001", amount: 450000, dueDate: "2025-09-10" },
    { id: 2, party: "Dealer B", reference: "Batch B-2024-002", amount: 275000, dueDate: "2025-09-12" },
  ];

  const payables = [
    { id: 1, party: "Medico Pharma", reference: "Invoice MP-1021", amount: 35000, dueDate: "2025-09-08" },
    { id: 2, party: "VetCare", reference: "Invoice VC-332", amount: 18000, dueDate: "2025-09-15" },
  ];

  const handleAddReminder = () => {
    if (!reminderForm.title.trim() || !reminderForm.date || !reminderForm.time) return;

    const newReminder = {
      id: Date.now(),
      title: reminderForm.title,
      date: reminderForm.date,
      time: reminderForm.time,
      type: reminderForm.type
    };

    setReminders([...reminders, newReminder]);
    setReminderForm({ title: '', date: '', time: '', type: 'Task Reminder' });
    setIsReminderModalOpen(false);
  };

  // Quick form handlers
  const updateQuickExpenseField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQuickExpenseForm((p) => ({ ...p, [name]: value }));
  };

  const updateQuickSaleField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setQuickSaleForm((p) => ({
      ...p,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const updateQuickLedgerField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQuickLedgerForm((p) => ({ ...p, [name]: value }));
  };

  // Handle feed selection from inventory
  const handleQuickFeedSelection = (feedId: string) => {
    const selectedFeed = feedInventory.find((feed) => feed.id === feedId);
    if (selectedFeed) {
      setQuickExpenseForm((prev) => ({
        ...prev,
        selectedFeedId: feedId,
        feedBrand: selectedFeed.name,
        feedRate: selectedFeed.rate.toString(),
      }));
    }
  };

  // Handle medicine selection from inventory
  const handleQuickMedicineSelection = (medicineId: string) => {
    const selectedMedicine = medicineInventory.find((medicine) => medicine.id === medicineId);
    if (selectedMedicine) {
      setQuickExpenseForm((prev) => ({
        ...prev,
        selectedMedicineId: medicineId,
        medicineName: selectedMedicine.name,
        medicineRate: selectedMedicine.rate.toString(),
      }));
    }
  };

  // Quick form submissions (for now just show success message - no backend integration)
  const submitQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickExpenseForm.batchId) {
      setQuickFormErrors({ batchId: "Please select a batch" });
      return;
    }
    // Simulate success
    alert(`Expense added to batch ${quickExpenseForm.batchId} successfully!`);
    setIsQuickExpenseOpen(false);
    setQuickExpenseForm({
      batchId: "",
      category: "Feed",
      date: "",
      notes: "",
      feedBrand: "",
      feedQuantity: "",
      feedRate: "",
      selectedFeedId: "",
      hatcheryName: "",
      hatcheryRate: "",
      hatcheryQuantity: "",
      medicineName: "",
      medicineRate: "",
      medicineQuantity: "",
      selectedMedicineId: "",
      otherName: "",
      otherRate: "",
      otherQuantity: "",
    });
    setQuickFormErrors({});
  };

  const submitQuickSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSaleForm.batchId) {
      setQuickFormErrors({ batchId: "Please select a batch" });
      return;
    }
    // Simulate success
    alert(`Sale added to batch ${quickSaleForm.batchId} successfully!`);
    setIsQuickSaleOpen(false);
    setQuickSaleForm({
      batchId: "",
      item: "Chicken",
      rate: "",
      quantity: "",
      remaining: false,
      customerName: "",
      contact: "",
      category: "Chicken",
      balance: "",
      date: "",
    });
    setQuickFormErrors({});
  };

  const submitQuickLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLedgerForm.batchId) {
      setQuickFormErrors({ batchId: "Please select a batch" });
      return;
    }
    // Simulate success
    alert(`Ledger entry added to batch ${quickLedgerForm.batchId} successfully!`);
    setIsQuickLedgerOpen(false);
    setQuickLedgerForm({
      batchId: "",
      name: "",
      contact: "",
      category: "Chicken",
      sales: "",
      received: "",
    });
    setQuickFormErrors({});
  };
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your farms today.
        </p>
      </div>

      {/* Modals */}
      <Modal isOpen={isFarmsOpen} onClose={() => setIsFarmsOpen(false)} title="All Farms">
        <ModalContent>
          <div className="space-y-3">
            {farms.map(f => (
              <div key={f.id} className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.location} • Capacity {f.capacity.toLocaleString()} birds</div>
                </div>
                <div className="text-right text-sm">Active {f.activeBatches} • Closed {f.closedBatches}</div>
              </div>
            ))}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsFarmsOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={isBatchesOpen} onClose={() => setIsBatchesOpen(false)} title="All Batches">
        <ModalContent>
          <div className="space-y-3">
            {sampleBatches.map(b => (
              <div key={b.id} className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60">
                <div>
                  <div className="font-medium">{b.code}</div>
                  <div className="text-xs text-muted-foreground">{b.farm} • Birds {b.birds.toLocaleString()} • Age {b.ageDays} days</div>
                </div>
                <div className={b.status === 'Active' ? 'text-green-600 text-sm font-medium' : 'text-muted-foreground text-sm font-medium'}>{b.status}</div>
              </div>
            ))}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsBatchesOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={isReceiveOpen} onClose={() => setIsReceiveOpen(false)} title="Money to Receive">
        <ModalContent>
          <div className="space-y-3">
            {receivables.map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60">
                <div>
                  <div className="font-medium">{r.party}</div>
                  <div className="text-xs text-muted-foreground">{r.reference} • Due {r.dueDate}</div>
                </div>
                <div className="text-right font-medium">₹{r.amount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsReceiveOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={isGiveOpen} onClose={() => setIsGiveOpen(false)} title="Money to Give">
        <ModalContent>
          <div className="space-y-3">
            {payables.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60">
                <div>
                  <div className="font-medium">{p.party}</div>
                  <div className="text-xs text-muted-foreground">{p.reference} • Due {p.dueDate}</div>
                </div>
                <div className="text-right font-medium">₹{p.amount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsGiveOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={isReminderModalOpen} onClose={() => setIsReminderModalOpen(false)} title="Add New Reminder">
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reminderTitle">Reminder Title *</Label>
              <Input
                id="reminderTitle"
                value={reminderForm.title}
                onChange={(e) => setReminderForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Collect payment from Ram"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reminderDate">Select Date *</Label>
                <Input
                  id="reminderDate"
                  type="date"
                  value={reminderForm.date}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reminderTime">Select Time *</Label>
                <Input
                  id="reminderTime"
                  type="time"
                  value={reminderForm.time}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, time: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reminderType">Reminder Type</Label>
              <select
                id="reminderType"
                value={reminderForm.type}
                onChange={(e) => setReminderForm(prev => ({ ...prev, type: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="Task Reminder">Task Reminder</option>
                <option value="Medical Reminder">Medical Reminder</option>
                <option value="Payment Reminder">Payment Reminder</option>
                <option value="Maintenance Reminder">Maintenance Reminder</option>
              </select>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsReminderModalOpen(false)}>Cancel</Button>
          <Button onClick={handleAddReminder} className="bg-primary hover:bg-primary/90">Add Reminder</Button>
        </ModalFooter>
      </Modal>

      {/* Quick Expense Modal */}
      <Modal
        isOpen={isQuickExpenseOpen}
        onClose={() => {
          setIsQuickExpenseOpen(false);
          setQuickFormErrors({});
        }}
        title="Quick Add Expense"
      >
        <form onSubmit={submitQuickExpense}>
          <ModalContent>
            <div className="space-y-4">
              {/* Batch Selection */}
              <div>
                <Label htmlFor="batchId">Select Batch *</Label>
                <select
                  id="batchId"
                  name="batchId"
                  value={quickExpenseForm.batchId}
                  onChange={updateQuickExpenseField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  required
                >
                  <option value="">Choose a batch</option>
                  {activeBatches.filter(batch => batch.status === "ACTIVE").map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber} - {batch.farm.name}
                    </option>
                  ))}
                </select>
                {quickFormErrors.batchId && (
                  <p className="text-xs text-red-600 mt-1">{quickFormErrors.batchId}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    name="category"
                    value={quickExpenseForm.category}
                    onChange={updateQuickExpenseField}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="Feed">Feed</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Hatchery">Hatchery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={quickExpenseForm.date}
                    onChange={updateQuickExpenseField}
                  />
                </div>
              </div>

              {quickExpenseForm.category === "Feed" && (
                <div className="grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="selectedFeedId">Feed Brand</Label>
                    <select
                      id="selectedFeedId"
                      name="selectedFeedId"
                      value={quickExpenseForm.selectedFeedId}
                      onChange={(e) => handleQuickFeedSelection(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="">Select feed from inventory</option>
                      {feedInventory.map((feed) => (
                        <option key={feed.id} value={feed.id}>
                          {feed.name} ({feed.quantity} {feed.unit} available)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="feedQuantity">Quantity</Label>
                    <Input
                      id="feedQuantity"
                      name="feedQuantity"
                      type="number"
                      value={quickExpenseForm.feedQuantity}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="feedRate">Rate per piece</Label>
                    <Input
                      id="feedRate"
                      name="feedRate"
                      type="number"
                      value={quickExpenseForm.feedRate}
                      onChange={updateQuickExpenseField}
                      readOnly={!!quickExpenseForm.selectedFeedId}
                      className={quickExpenseForm.selectedFeedId ? "bg-gray-50" : ""}
                    />
                  </div>
                </div>
              )}

              {quickExpenseForm.category === "Medicine" && (
                <div className="grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="selectedMedicineId">Medicine Name</Label>
                    <select
                      id="selectedMedicineId"
                      name="selectedMedicineId"
                      value={quickExpenseForm.selectedMedicineId}
                      onChange={(e) => handleQuickMedicineSelection(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="">Select medicine from inventory</option>
                      {medicineInventory.map((medicine) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.name} ({medicine.quantity} {medicine.unit} available)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="medicineQuantity">Quantity</Label>
                    <Input
                      id="medicineQuantity"
                      name="medicineQuantity"
                      type="number"
                      value={quickExpenseForm.medicineQuantity}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="medicineRate">Rate</Label>
                    <Input
                      id="medicineRate"
                      name="medicineRate"
                      type="number"
                      value={quickExpenseForm.medicineRate}
                      onChange={updateQuickExpenseField}
                      readOnly={!!quickExpenseForm.selectedMedicineId}
                      className={quickExpenseForm.selectedMedicineId ? "bg-gray-50" : ""}
                    />
                  </div>
                </div>
              )}

              {quickExpenseForm.category === "Hatchery" && (
                <div className="grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="hatcheryName">Hatchery Name</Label>
                    <Input
                      id="hatcheryName"
                      name="hatcheryName"
                      value={quickExpenseForm.hatcheryName}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hatcheryQuantity">Quantity</Label>
                    <Input
                      id="hatcheryQuantity"
                      name="hatcheryQuantity"
                      type="number"
                      value={quickExpenseForm.hatcheryQuantity}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hatcheryRate">Rate</Label>
                    <Input
                      id="hatcheryRate"
                      name="hatcheryRate"
                      type="number"
                      value={quickExpenseForm.hatcheryRate}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                </div>
              )}

              {quickExpenseForm.category === "Other" && (
                <div className="grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="otherName">Expense Name</Label>
                    <Input
                      id="otherName"
                      name="otherName"
                      value={quickExpenseForm.otherName}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="otherQuantity">Quantity</Label>
                    <Input
                      id="otherQuantity"
                      name="otherQuantity"
                      type="number"
                      value={quickExpenseForm.otherQuantity}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="otherRate">Rate</Label>
                    <Input
                      id="otherRate"
                      name="otherRate"
                      type="number"
                      value={quickExpenseForm.otherRate}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={quickExpenseForm.notes}
                  onChange={updateQuickExpenseField}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsQuickExpenseOpen(false);
                setQuickFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Add Expense
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Quick Sale Modal */}
      <Modal
        isOpen={isQuickSaleOpen}
        onClose={() => {
          setIsQuickSaleOpen(false);
          setQuickFormErrors({});
        }}
        title="Quick Add Sale"
      >
        <form onSubmit={submitQuickSale}>
          <ModalContent>
            <div className="space-y-4">
              {/* Batch Selection */}
              <div>
                <Label htmlFor="saleBatchId">Select Batch *</Label>
                <select
                  id="saleBatchId"
                  name="batchId"
                  value={quickSaleForm.batchId}
                  onChange={updateQuickSaleField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  required
                >
                  <option value="">Choose a batch</option>
                  {activeBatches.filter(batch => batch.status === "ACTIVE").map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber} - {batch.farm.name}
                    </option>
                  ))}
                </select>
                {quickFormErrors.batchId && (
                  <p className="text-xs text-red-600 mt-1">{quickFormErrors.batchId}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item">Item</Label>
                  <select
                    id="item"
                    name="item"
                    value={quickSaleForm.item}
                    onChange={updateQuickSaleField}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="Chicken">Chicken</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="saleDate">Date</Label>
                  <Input
                    id="saleDate"
                    name="date"
                    type="date"
                    value={quickSaleForm.date}
                    onChange={updateQuickSaleField}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate">Rate</Label>
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    value={quickSaleForm.rate}
                    onChange={updateQuickSaleField}
                    placeholder="Rate per unit"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={quickSaleForm.quantity}
                    onChange={updateQuickSaleField}
                    placeholder="Quantity sold"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="remaining"
                    checked={quickSaleForm.remaining}
                    onChange={updateQuickSaleField}
                    className="h-4 w-4"
                  />
                  Remaining balance?
                </label>
              </div>

              {quickSaleForm.remaining && (
                <div className="grid md:grid-cols-2 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={quickSaleForm.customerName}
                      onChange={updateQuickSaleField}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      name="contact"
                      value={quickSaleForm.contact}
                      onChange={updateQuickSaleField}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="saleCategory">Category</Label>
                    <select
                      id="saleCategory"
                      name="category"
                      value={quickSaleForm.category}
                      onChange={updateQuickSaleField}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="Chicken">Chicken</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="balance">Balance Amount</Label>
                    <Input
                      id="balance"
                      name="balance"
                      type="number"
                      value={quickSaleForm.balance}
                      onChange={updateQuickSaleField}
                      placeholder="Remaining balance"
                    />
                  </div>
                </div>
              )}
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsQuickSaleOpen(false);
                setQuickFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Add Sale
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Quick Ledger Modal */}
      <Modal
        isOpen={isQuickLedgerOpen}
        onClose={() => {
          setIsQuickLedgerOpen(false);
          setQuickFormErrors({});
        }}
        title="Quick Add Sales Balance"
      >
        <form onSubmit={submitQuickLedger}>
          <ModalContent>
            <div className="space-y-4">
              {/* Batch Selection */}
              <div>
                <Label htmlFor="ledgerBatchId">Select Batch *</Label>
                <select
                  id="ledgerBatchId"
                  name="batchId"
                  value={quickLedgerForm.batchId}
                  onChange={updateQuickLedgerField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  required
                >
                  <option value="">Choose a batch</option>
                  {activeBatches.filter(batch => batch.status === "ACTIVE").map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber} - {batch.farm.name}
                    </option>
                  ))}
                </select>
                {quickFormErrors.batchId && (
                  <p className="text-xs text-red-600 mt-1">{quickFormErrors.batchId}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Customer Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={quickLedgerForm.name}
                    onChange={updateQuickLedgerField}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ledgerContact">Contact</Label>
                  <Input
                    id="ledgerContact"
                    name="contact"
                    value={quickLedgerForm.contact}
                    onChange={updateQuickLedgerField}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="ledgerCategory">Category</Label>
                  <select
                    id="ledgerCategory"
                    name="category"
                    value={quickLedgerForm.category}
                    onChange={updateQuickLedgerField}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="Chicken">Chicken</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="sales">Sales Amount</Label>
                  <Input
                    id="sales"
                    name="sales"
                    type="number"
                    value={quickLedgerForm.sales}
                    onChange={updateQuickLedgerField}
                    placeholder="Total sales"
                  />
                </div>
                <div>
                  <Label htmlFor="received">Received Amount</Label>
                  <Input
                    id="received"
                    name="received"
                    type="number"
                    value={quickLedgerForm.received}
                    onChange={updateQuickLedgerField}
                    placeholder="Amount received"
                  />
                </div>
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsQuickLedgerOpen(false);
                setQuickFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Add Entry
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card onClick={() => setIsFarmsOpen(true)} className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">+1 from last month</p>
          </CardContent>
        </Card>

        <Card onClick={() => setIsBatchesOpen(true)} className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Batches
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              2 completing this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹3.2M</div>
            <p className="text-xs text-muted-foreground">All-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹2.4M</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Button
            onClick={() => setIsQuickExpenseOpen(true)}
            className="h-16 bg-red-500 hover:bg-red-600 text-white flex flex-col items-center justify-center space-y-2"
          >
            <Receipt className="h-6 w-6" />
            <span className="text-sm font-medium">Add Expense</span>
          </Button>
          <Button
            onClick={() => setIsQuickSaleOpen(true)}
            className="h-16 bg-green-500 hover:bg-green-600 text-white flex flex-col items-center justify-center space-y-2"
          >
            <TrendingUp className="h-6 w-6" />
            <span className="text-sm font-medium">Add Sale</span>
          </Button>
          <Button
            onClick={() => setIsQuickLedgerOpen(true)}
            className="h-16 bg-blue-500 hover:bg-blue-600 text-white flex flex-col items-center justify-center space-y-2"
          >
            <CreditCard className="h-6 w-6" />
            <span className="text-sm font-medium">Sales Balance</span>
          </Button>
        </div>
      </div>

      {/* Money Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card onClick={() => setIsReceiveOpen(true)} className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Money to Receive
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹1.8M</div>
            <p className="text-xs text-muted-foreground">
              From completed batches
            </p>
          </CardContent>
        </Card>

        <Card onClick={() => setIsGiveOpen(true)} className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money to Give</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹235,000</div>
            <p className="text-xs text-muted-foreground">
              To suppliers & dealers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹450,000</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Reminders */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your farms and batches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Batch #B-2024-001 completed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Farm A - 2 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New expense recorded</p>
                  <p className="text-xs text-muted-foreground">
                    Feed purchase - ₹45,000 - 4 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Low inventory alert</p>
                  <p className="text-xs text-muted-foreground">
                    Medicine stock below threshold - 6 hours ago
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reminders</CardTitle>
                <CardDescription>
                  Your upcoming tasks and reminders.
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={() => setIsReminderModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-muted/50">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{reminder.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {reminder.date} • {reminder.time} • {reminder.type}
                    </p>
                  </div>
                </div>
              ))}
              {reminders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reminders yet</p>
                  <Button 
                    size="sm" 
                    onClick={() => setIsReminderModalOpen(true)}
                    className="mt-4 bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Reminder
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
