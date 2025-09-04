"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Layers, Plus, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BatchItem {
  id: number;
  code: string;
  farm: string;
  startDate: string;
  initialBirds: number;
  status: "Active" | "Closed";
}



export default function BatchesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batches, setBatches] = useState<BatchItem[]>([
    {
      id: 1,
      code: "B-2024-001",
      farm: "Farm A",
      startDate: "2024-01-15",
      initialBirds: 2500,
      status: "Active",
    },
    {
      id: 2,
      code: "B-2024-002",
      farm: "Farm B",
      startDate: "2024-01-20",
      initialBirds: 2000,
      status: "Active",
    },
  ]);

  // Mock farms list (later replace with API data)
  const farms = ["Farm A", "Farm B", "Farm C"];

  const [formData, setFormData] = useState({
    code: "",
    farm: farms[0] ?? "",
    startDate: "",
    initialBirds: "",
    notes: "",
  });

  // Modal for counts (active/closed lists)
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [countFilter, setCountFilter] = useState<"Active" | "Closed">("Active");

  function openCountModal(filter: "Active" | "Closed") {
    setCountFilter(filter);
    setIsCountModalOpen(true);
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newBatch: BatchItem = {
      id: batches.length + 1,
      code:
        formData.code ||
        `B-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, "0")}`,
      farm: formData.farm || farms[0] || "Unknown Farm",
      startDate: formData.startDate || new Date().toISOString().slice(0, 10),
      initialBirds: Number(formData.initialBirds || 0),
      status: "Active",
    };
    setBatches((prev) => [newBatch, ...prev]);
    setIsModalOpen(false);
    setFormData({
      code: "",
      farm: farms[0] ?? "",
      startDate: "",
      initialBirds: "",
      notes: "",
    });
  }

  function handleClose() {
    setIsModalOpen(false);
    setFormData({
      code: "",
      farm: farms[0] ?? "",
      startDate: "",
      initialBirds: "",
      notes: "",
    });
  }

  const activeBatches = batches.filter((b) => b.status === "Active");
  const closedBatches = batches.filter((b) => b.status === "Closed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
          <p className="text-muted-foreground">
            Track your production batches and performance.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Batch
        </Button>
      </div>

      {/* Batch Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="group cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground hover:border-transparent"
          onClick={() => openCountModal("Active")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-primary-foreground">
              Active Batches
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold group-hover:text-primary-foreground">
              {activeBatches.length}
            </div>
            <p className="text-xs text-muted-foreground group-hover:text-primary-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Birds</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batches.reduce((sum, b) => sum + b.initialBirds, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all batches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Mortality
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3%</div>
            <p className="text-xs text-muted-foreground">
              Industry standard: 3%
            </p>
          </CardContent>
        </Card>

        <Card
          className="group cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground hover:border-transparent"
          onClick={() => openCountModal("Closed")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-primary-foreground">
              Closed Batches
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold group-hover:text-primary-foreground">
              {closedBatches.length}
            </div>
            <p className="text-xs text-muted-foreground group-hover:text-primary-foreground">
              Till now
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Batches List */}
      <div className="grid gap-4">
        {batches.map((b) => (
          <Link key={b.id} href={`  /dashboard/batches/${b.id}`} className="block">
            <Card className="hover:border-primary cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{b.code}</span>
                  <Badge
                    variant="default"
                    className={
                      b.status === "Active" ? "bg-green-100 text-green-800" : ""
                    }
                  >
                    {b.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {b.farm} • Started:{" "}
                  {new Date(b.startDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Initial Birds:
                    </span>
                    <p className="font-medium">
                      {b.initialBirds.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Current Birds:
                    </span>
                    <p className="font-medium">—</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Age:</span>
                    <p className="font-medium">—</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p
                      className={`font-medium ${b.status === "Active" ? "text-green-600" : ""}`}
                    >
                      {b.status}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* New Batch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="Create New Batch"
      >
        <form onSubmit={handleSubmit}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Batch Code</Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g., B-2024-003"
                />
              </div>
              <div>
                <Label htmlFor="farm">Farm</Label>
                <select
                  id="farm"
                  name="farm"
                  value={formData.farm}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  required
                >
                  {farms.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="initialBirds">Initial Birds</Label>
                <Input
                  id="initialBirds"
                  name="initialBirds"
                  type="number"
                  value={formData.initialBirds}
                  onChange={handleChange}
                  placeholder="e.g., 2500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Any remarks"
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Create Batch
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Active/Closed Lists Modal */}
      <Modal
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        title={`${countFilter} Batches`}
      >
        <ModalContent>
          <div className="space-y-3">
            {(countFilter === "Active" ? activeBatches : closedBatches).map(
              (b) => (
                <Link key={b.id} href={`/dashboard/batches/${b.id}`} className="block">
                  <div className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60 cursor-pointer">
                    <div>
                      <div className="font-medium">{b.code}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.farm} • Started:{" "}
                        {new Date(b.startDate).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        countFilter === "Active"
                          ? "text-green-600 border-green-600/30"
                          : ""
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>
                </Link>
              )
            )}
            {(countFilter === "Active" ? activeBatches : closedBatches)
              .length === 0 && (
              <p className="text-sm text-muted-foreground">
                No {countFilter.toLowerCase()} batches.
              </p>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsCountModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
