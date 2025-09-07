"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";

export default function FarmsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    capacity: "",
    description: ""
  });

  // State to manage farms list
  const [farms, setFarms] = useState([
    {
      id: 1,
      name: "Farm A",
      capacity: "5,000 birds",
      activeBatches: 2,
      closedBatches: 5,
      status: "Active"
    },
    {
      id: 2,
      name: "Farm B", 
      capacity: "3,500 birds",
      activeBatches: 1,
      closedBatches: 3,
      status: "Active"
    },
    {
      id: 3,
      name: "Farm C",
      capacity: "4,000 birds",
      activeBatches: 2,
      closedBatches: 4,
      status: "Active"
    }
  ]);

  // Batches modal state
  const [isBatchesModalOpen, setIsBatchesModalOpen] = useState(false);
  const [batchFilter, setBatchFilter] = useState<"active" | "closed">("active");
  const [selectedFarm, setSelectedFarm] = useState<{ id: number; name: string } | null>(null);

  const openBatchesModal = (farmId: number, farmName: string, filter: "active" | "closed") => {
    setSelectedFarm({ id: farmId, name: farmName });
    setBatchFilter(filter);
    setIsBatchesModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create new farm object
    const newFarm = {
      id: farms.length + 1,
      name: formData.name,
      capacity: `${formData.capacity} birds`,
      activeBatches: 0,
      closedBatches: 0,
      status: "Active"
    } as const;

    // Add new farm to the list
    setFarms(prevFarms => [...prevFarms, newFarm]);
    
    // Reset form and close modal
    setIsModalOpen(false);
    setFormData({ name: "", capacity: "", description: "" });
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setFormData({ name: "", capacity: "", description: "" });
  };

  // Mock batches generator (replace with API later)
  function getBatchesForFarm(farmId: number, filter: "active" | "closed") {
    const sample = [
      { id: 1, code: "B-2024-001", birds: 2500, ageDays: 32, status: "Active" },
      { id: 2, code: "B-2024-002", birds: 2000, ageDays: 27, status: "Active" },
      { id: 3, code: "B-2023-019", birds: 2300, ageDays: 45, status: "Closed" },
      { id: 4, code: "B-2023-020", birds: 2100, ageDays: 46, status: "Closed" },
    ];
    return sample.filter(b => (filter === "active" ? b.status === "Active" : b.status === "Closed"));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Farms</h1>
          <p className="text-muted-foreground">
            Manage your farm locations and details.
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Farm
        </Button>
      </div>

      {/* Farms Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {farms.map((farm) => (
          <Card key={farm.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {farm.name}
                </span>
              </CardTitle>
              <CardDescription>Farm ID: {farm.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="font-medium">{farm.capacity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-green-600 font-medium">{farm.status}</span>
                </div>

                {/* Batches Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="h-8 px-3 cursor-pointer w-full sm:w-auto transition-colors hover:bg-[#10841E] hover:text-white hover:border-[#10841E]"
                    onClick={() => openBatchesModal(farm.id, farm.name, "active")}
                  >
                    Active Batches ({farm.activeBatches})
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 px-3 cursor-pointer w-full sm:w-auto transition-colors hover:bg-[#10841E] hover:text-white hover:border-[#10841E]"
                    onClick={() => openBatchesModal(farm.id, farm.name, "closed")}
                  >
                    Closed Batches ({farm.closedBatches})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Farm Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="Add New Farm"
      >
        <form onSubmit={handleSubmit}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Farm Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter farm name"
                  required
                />
              </div>


              <div>
                <Label htmlFor="capacity">Capacity (Number of Birds)</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  placeholder="Enter maximum capacity"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter farm description"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                />
              </div>
            </div>
          </ModalContent>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Create Farm
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Batches List Modal */}
      <Modal
        isOpen={isBatchesModalOpen}
        onClose={() => setIsBatchesModalOpen(false)}
        title={`${selectedFarm?.name ?? "Farm"} – ${batchFilter === "active" ? "Active" : "Closed"} Batches`}
      >
        <ModalContent>
          <div className="space-y-3">
            {getBatchesForFarm(selectedFarm?.id ?? 0, batchFilter).map((b) => (
              <Link key={b.id} href={`/dashboard/batches/${b.id}`} className="block">
                <div className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60 cursor-pointer">
                  <div>
                    <div className="font-medium">{b.code}</div>
                    <div className="text-xs text-muted-foreground">Birds: {b.birds} • Age: {b.ageDays} days</div>
                  </div>
                  <span className={batchFilter === 'active' ? 'text-green-600 text-sm font-medium' : 'text-muted-foreground text-sm font-medium'}>
                    {batchFilter === "active" ? "Active" : "Closed"}
                  </span>
                </div>
              </Link>
            ))}
            {getBatchesForFarm(selectedFarm?.id ?? 0, batchFilter).length === 0 && (
              <p className="text-sm text-muted-foreground">No {batchFilter} batches found.</p>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsBatchesModalOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
