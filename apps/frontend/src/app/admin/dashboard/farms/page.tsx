"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/common/components/ui/table";
import { 
  Building2, 
  TrendingUp, 
  Package, 
  MapPin, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  BarChart3,
  Target
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Mock farm data
const mockFarms = [
  {
    id: 1,
    name: "GreenFields Poultry",
    owner: "Emily Chen",
    location: "California, USA",
    status: "Active",
    capacity: 5000,
    currentBirds: 4200,
    utilizationRate: 84,
    totalBatches: 23,
    avgMortality: 2.1,
    avgFCR: 1.42,
    totalRevenue: 198000,
    monthlyGrowth: "+24%",
    performance: "Excellent",
    established: "2023-03-15"
  },
  {
    id: 2,
    name: "Sunrise Farm Co.",
    owner: "John Smith",
    location: "Texas, USA",
    status: "Active",
    capacity: 3000,
    currentBirds: 2850,
    utilizationRate: 95,
    totalBatches: 18,
    avgMortality: 3.2,
    avgFCR: 1.48,
    totalRevenue: 125000,
    monthlyGrowth: "+18%",
    performance: "Good",
    established: "2023-01-20"
  },
  {
    id: 3,
    name: "Family Farm",
    owner: "Robert Wilson",
    location: "Iowa, USA",
    status: "Active",
    capacity: 1500,
    currentBirds: 1200,
    utilizationRate: 80,
    totalBatches: 12,
    avgMortality: 2.8,
    avgFCR: 1.45,
    totalRevenue: 67000,
    monthlyGrowth: "+12%",
    performance: "Good",
    established: "2023-06-10"
  }
];

const topPerformers = [
  { name: "GreenFields Poultry", utilization: 84, revenue: 198000, growth: "+24%" },
  { name: "Sunrise Farm Co.", utilization: 95, revenue: 125000, growth: "+18%" },
  { name: "Family Farm", utilization: 80, revenue: 67000, growth: "+12%" }
];

export default function AdminFarmsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const router = useRouter();

  const filteredFarms = mockFarms.filter(farm => {
    const matchesSearch = farm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         farm.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         farm.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || farm.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    return status === "Active" 
      ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
      : <Badge variant="secondary">Inactive</Badge>;
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
          <h1 className="text-3xl font-bold">Farm Analytics</h1>
          <p className="text-muted-foreground">
            Monitor farm performance, capacity utilization, and productivity metrics
          </p>
        </div>
        <Button onClick={() => router.push("/admin/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      {/* Farm Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farms</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-green-600">+3.2% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78.5%</div>
            <p className="text-xs text-green-600">+2.1% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">485K</div>
            <p className="text-xs text-green-600">+5.8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg FCR</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.45</div>
            <p className="text-xs text-green-600">-0.02 from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Farms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Top Performing Farms</span>
          </CardTitle>
          <CardDescription>
            Farms ranked by utilization rate and revenue performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.map((farm, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{farm.name}</p>
                    <p className="text-sm text-muted-foreground">{farm.utilization}% utilization</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${farm.revenue.toLocaleString()}</p>
                  <p className="text-sm text-green-600">{farm.growth}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Farms Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Farms</CardTitle>
              <CardDescription>
                Comprehensive list of all farms with their performance metrics and analytics
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Farm
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
                placeholder="Search farms by name, owner, or location..."
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
              <option value="inactive">Inactive</option>
            </select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Farms Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farm</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>FCR</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFarms.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{farm.name}</div>
                        <div className="text-sm text-muted-foreground">{farm.established}</div>
                      </div>
                    </TableCell>
                    <TableCell>{farm.owner}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{farm.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(farm.status)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{farm.capacity.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{farm.currentBirds.toLocaleString()} current</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${farm.utilizationRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{farm.utilizationRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{farm.avgFCR}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">${farm.totalRevenue.toLocaleString()}</div>
                        <div className="text-sm text-green-600">{farm.monthlyGrowth}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getPerformanceBadge(farm.performance)}</TableCell>
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
              Showing {filteredFarms.length} of {mockFarms.length} farms
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
