"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/common/components/ui/table";
import { 
  Package, 
  TrendingUp, 
  Calendar, 
  Users, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  BarChart3,
  Activity,
  Target
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Mock batch data
const mockBatches = [
  {
    id: 1,
    batchNumber: "B-2024-001",
    farmName: "GreenFields Poultry",
    startDate: "2024-08-15",
    endDate: "2024-10-15",
    status: "Active",
    birdCount: 4200,
    currentAge: 45,
    mortality: 2.1,
    fcr: 1.42,
    weight: 2.8,
    performance: "Excellent"
  },
  {
    id: 2,
    batchNumber: "B-2024-002",
    farmName: "Sunrise Farm Co.",
    startDate: "2024-09-01",
    endDate: "2024-11-01",
    status: "Active",
    birdCount: 2850,
    currentAge: 30,
    mortality: 3.2,
    fcr: 1.48,
    weight: 2.2,
    performance: "Good"
  },
  {
    id: 3,
    batchNumber: "B-2024-003",
    farmName: "Family Farm",
    startDate: "2024-07-20",
    endDate: "2024-09-20",
    status: "Completed",
    birdCount: 1200,
    currentAge: 0,
    mortality: 2.8,
    fcr: 1.45,
    weight: 2.9,
    performance: "Good"
  }
];

export default function AdminBatchesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const router = useRouter();

  const filteredBatches = mockBatches.filter(batch => {
    const matchesSearch = batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.farmName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || batch.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      "Active": "bg-green-100 text-green-800 hover:bg-green-100",
      "Completed": "bg-blue-100 text-blue-800 hover:bg-blue-100",
      "Cancelled": "bg-red-100 text-red-800 hover:bg-red-100"
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getPerformanceBadge = (performance: string) => {
    const variants = {
      "Excellent": "bg-green-100 text-green-800 hover:bg-green-100",
      "Good": "bg-blue-100 text-blue-800 hover:bg-blue-100", 
      "Average": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    };
    return <Badge className={variants[performance as keyof typeof variants]}>{performance}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Management</h1>
          <p className="text-muted-foreground">
            Track and manage poultry batches across all farms
          </p>
        </div>
        <Button onClick={() => router.push("/admin/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      {/* Batch Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-green-600">+5.2% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Mortality</CardTitle>
            <Activity className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <p className="text-xs text-green-600">-0.3% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg FCR</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.45</div>
            <p className="text-xs text-green-600">-0.02 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Birds</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">485K</div>
            <p className="text-xs text-green-600">+8.1% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* All Batches Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Batches</CardTitle>
              <CardDescription>
                Comprehensive list of all batches with their performance metrics
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Batch
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search batches by number or farm name..."
                className="h-9 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Batches Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Farm</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bird Count</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Mortality</TableHead>
                  <TableHead>FCR</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.batchNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{batch.farmName}</TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>{batch.birdCount.toLocaleString()}</TableCell>
                    <TableCell>
                      {batch.status === "Active" ? `${batch.currentAge} days` : "Completed"}
                    </TableCell>
                    <TableCell>{batch.mortality}%</TableCell>
                    <TableCell>{batch.fcr}</TableCell>
                    <TableCell>{batch.weight} kg</TableCell>
                    <TableCell>{getPerformanceBadge(batch.performance)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredBatches.length} of {mockBatches.length} batches
            </p>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
