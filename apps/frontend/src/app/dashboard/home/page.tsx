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
  Package,
  TrendingUp,
  DollarSign,
  CreditCard,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/store/store";
import { useState } from "react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();
  const [isFarmsOpen, setIsFarmsOpen] = useState(false);
  const [isBatchesOpen, setIsBatchesOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isGiveOpen, setIsGiveOpen] = useState(false);

  const farms = [
    { id: 1, name: "Farm A", location: "Bharatpur, Chitwan", capacity: 5000, activeBatches: 2, closedBatches: 5 },
    { id: 2, name: "Farm B", location: "Pokhara, Kaski", capacity: 3500, activeBatches: 1, closedBatches: 3 },
    { id: 3, name: "Farm C", location: "Butwal, Rupandehi", capacity: 4000, activeBatches: 2, closedBatches: 4 },
  ];

  const batches = [
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
            {batches.map(b => (
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

      {/* Recent Activity */}
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
    </div>
  );
}
