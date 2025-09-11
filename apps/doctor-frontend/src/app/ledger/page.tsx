"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  Plus,
  ArrowLeft,
  IndianRupee,
  Calendar,
  Package,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface LedgerEntry {
  id: string;
  item: string;
  price: number;
  quantity: number;
  amountPaid: number;
  amountDue: number;
  date: string;
  ledgerName: string;
}

interface LedgerTab {
  id: string;
  name: string;
  entries: LedgerEntry[];
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
}

export default function LedgerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("medicines");
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [isAddTabModalOpen, setIsAddTabModalOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    item: '',
    price: '',
    quantity: '',
    amountPaid: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [newTabName, setNewTabName] = useState('');

  // Mock data for different ledger tabs
  const [ledgerTabs, setLedgerTabs] = useState<LedgerTab[]>([
    {
      id: "medicines",
      name: "Medicines",
      totalAmount: 8500,
      totalPaid: 6000,
      totalDue: 2500,
      entries: [
        {
          id: "1",
          item: "Antibiotic Injection",
          price: 150,
          quantity: 10,
          amountPaid: 1000,
          amountDue: 500,
          date: "2025-09-10",
          ledgerName: "medicines"
        },
        {
          id: "2", 
          item: "Vitamin Supplement",
          price: 80,
          quantity: 25,
          amountPaid: 1500,
          amountDue: 500,
          date: "2025-09-09",
          ledgerName: "medicines"
        }
      ]
    },
    {
      id: "equipment",
      name: "Equipment",
      totalAmount: 4200,
      totalPaid: 3000,
      totalDue: 1200,
      entries: [
        {
          id: "3",
          item: "Digital Thermometer",
          price: 1200,
          quantity: 2,
          amountPaid: 2000,
          amountDue: 400,
          date: "2025-09-08",
          ledgerName: "equipment"
        }
      ]
    },
    {
      id: "consultation",
      name: "Consultation Fees",
      totalAmount: 2540,
      totalPaid: 2540,
      totalDue: 0,
      entries: [
        {
          id: "4",
          item: "Farm Visit - Green Valley",
          price: 500,
          quantity: 1,
          amountPaid: 500,
          amountDue: 0,
          date: "2025-09-11",
          ledgerName: "consultation"
        }
      ]
    }
  ]);

  const currentTab = ledgerTabs.find(tab => tab.id === activeTab);

  const handleAddEntry = () => {
    if (!entryForm.item.trim() || !entryForm.price || !entryForm.quantity) return;

    const price = parseFloat(entryForm.price);
    const quantity = parseInt(entryForm.quantity);
    const amountPaid = parseFloat(entryForm.amountPaid) || 0;
    const totalAmount = price * quantity;
    const amountDue = totalAmount - amountPaid;

    const newEntry: LedgerEntry = {
      id: Date.now().toString(),
      item: entryForm.item,
      price: price,
      quantity: quantity,
      amountPaid: amountPaid,
      amountDue: amountDue,
      date: entryForm.date,
      ledgerName: activeTab
    };

    setLedgerTabs(prev => prev.map(tab => {
      if (tab.id === activeTab) {
        const updatedEntries = [...tab.entries, newEntry];
        const newTotalAmount = updatedEntries.reduce((sum, entry) => sum + (entry.price * entry.quantity), 0);
        const newTotalPaid = updatedEntries.reduce((sum, entry) => sum + entry.amountPaid, 0);
        const newTotalDue = updatedEntries.reduce((sum, entry) => sum + entry.amountDue, 0);
        
        return {
          ...tab,
          entries: updatedEntries,
          totalAmount: newTotalAmount,
          totalPaid: newTotalPaid,
          totalDue: newTotalDue
        };
      }
      return tab;
    }));

    setEntryForm({ item: '', price: '', quantity: '', amountPaid: '', date: new Date().toISOString().split('T')[0] });
    setIsAddEntryModalOpen(false);
  };

  const handleAddTab = () => {
    if (!newTabName.trim()) return;

    const newTab: LedgerTab = {
      id: newTabName.toLowerCase().replace(/\s+/g, '-'),
      name: newTabName,
      entries: [],
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0
    };

    setLedgerTabs(prev => [...prev, newTab]);
    setNewTabName('');
    setIsAddTabModalOpen(false);
  };

  const handlePayment = (entryId: string, currentDue: number) => {
    // Mock payment - in real app, this would integrate with payment gateway
    setLedgerTabs(prev => prev.map(tab => {
      if (tab.id === activeTab) {
        const updatedEntries = tab.entries.map(entry => {
          if (entry.id === entryId) {
            return {
              ...entry,
              amountPaid: entry.amountPaid + currentDue,
              amountDue: 0
            };
          }
          return entry;
        });
        
        const newTotalPaid = updatedEntries.reduce((sum, entry) => sum + entry.amountPaid, 0);
        const newTotalDue = updatedEntries.reduce((sum, entry) => sum + entry.amountDue, 0);
        
        return {
          ...tab,
          entries: updatedEntries,
          totalPaid: newTotalPaid,
          totalDue: newTotalDue
        };
      }
      return tab;
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Ledger Management</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setIsAddTabModalOpen(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Tab
              </Button>
              <Button
                onClick={() => setIsAddEntryModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Entry
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{currentTab?.totalAmount.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
              <CreditCard className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{currentTab?.totalPaid.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
              <CreditCard className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">₹{currentTab?.totalDue.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 border-b">
          {ledgerTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.name}
              {tab.totalDue > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-800 text-xs">
                  ₹{tab.totalDue}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Ledger Entries */}
        <Card>
          <CardHeader>
            <CardTitle>{currentTab?.name} Ledger</CardTitle>
            <CardDescription>
              Track items, payments, and dues for {currentTab?.name.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentTab?.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{entry.item}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>₹{entry.price} × {entry.quantity}</span>
                          <span>•</span>
                          <span>{entry.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Total: ₹{(entry.price * entry.quantity).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-green-600">
                        Paid: ₹{entry.amountPaid.toLocaleString('en-IN')}
                      </div>
                      {entry.amountDue > 0 && (
                        <div className="text-xs text-red-600">
                          Due: ₹{entry.amountDue.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                    {entry.amountDue > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handlePayment(entry.id, entry.amountDue)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Pay ₹{entry.amountDue}
                      </Button>
                    )}
                    {entry.amountDue === 0 && (
                      <Badge className="bg-green-100 text-green-800">
                        Paid
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {(!currentTab?.entries || currentTab.entries.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No entries in this ledger</p>
                  <Button
                    onClick={() => setIsAddEntryModalOpen(true)}
                    className="mt-2 bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Entry
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Entry Modal */}
        <Modal
          isOpen={isAddEntryModalOpen}
          onClose={() => setIsAddEntryModalOpen(false)}
          title={`Add Entry to ${currentTab?.name}`}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="item">Item Name</Label>
              <Input
                id="item"
                value={entryForm.item}
                onChange={(e) => setEntryForm(prev => ({ ...prev, item: e.target.value }))}
                placeholder="Enter item name"
                className="mt-1"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price per Unit (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  value={entryForm.price}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={entryForm.quantity}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amountPaid">Amount Paid (₹)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  value={entryForm.amountPaid}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={entryForm.date}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {entryForm.price && entryForm.quantity && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-medium">₹{(parseFloat(entryForm.price) * parseInt(entryForm.quantity) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span className="text-green-600">₹{(parseFloat(entryForm.amountPaid) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Amount Due:</span>
                    <span className="text-red-600">₹{((parseFloat(entryForm.price) * parseInt(entryForm.quantity)) - (parseFloat(entryForm.amountPaid) || 0) || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddEntryModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEntry} className="bg-primary hover:bg-primary/90">
                Add Entry
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add Tab Modal */}
        <Modal
          isOpen={isAddTabModalOpen}
          onClose={() => setIsAddTabModalOpen(false)}
          title="Add New Ledger Tab"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="tabName">Tab Name</Label>
              <Input
                id="tabName"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="e.g., Feed, Vaccines, Equipment"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddTabModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTab} className="bg-primary hover:bg-primary/90">
                Add Tab
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
