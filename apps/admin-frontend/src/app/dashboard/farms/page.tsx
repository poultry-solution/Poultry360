'use client';

import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building2, 
  TrendingUp, 
  Users, 
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
  Activity,
  Target
} from 'lucide-react';
import { useState } from 'react';

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
    capacity: 3500,
    currentBirds: 2800,
    utilizationRate: 80,
    totalBatches: 18,
    avgMortality: 3.2,
    avgFCR: 1.58,
    totalRevenue: 125000,
    monthlyGrowth: "+18%",
    performance: "Good",
    established: "2023-01-20"
  },
  {
    id: 3,
    name: "Valley Poultry Ranch",
    owner: "Sarah Johnson",
    location: "Oregon, USA",
    status: "Active",
    capacity: 2500,
    currentBirds: 1900,
    utilizationRate: 76,
    totalBatches: 15,
    avgMortality: 2.8,
    avgFCR: 1.51,
    totalRevenue: 89000,
    monthlyGrowth: "+15%",
    performance: "Good",
    established: "2023-02-10"
  },
  {
    id: 4,
    name: "Heritage Farms LLC",
    owner: "Mike Davis",
    location: "Georgia, USA",
    status: "Maintenance",
    capacity: 1800,
    currentBirds: 900,
    utilizationRate: 50,
    totalBatches: 8,
    avgMortality: 4.1,
    avgFCR: 1.75,
    totalRevenue: 45000,
    monthlyGrowth: "-5%",
    performance: "Needs Improvement",
    established: "2022-11-05"
  },
  {
    id: 5,
    name: "Prime Poultry Solutions",
    owner: "Robert Wilson",
    location: "Florida, USA",
    status: "Active",
    capacity: 4200,
    currentBirds: 3400,
    utilizationRate: 81,
    totalBatches: 20,
    avgMortality: 2.5,
    avgFCR: 1.45,
    totalRevenue: 156000,
    monthlyGrowth: "+21%",
    performance: "Excellent",
    established: "2023-01-30"
  }
];

const topPerformingFarms = [
  { name: "GreenFields Poultry", revenue: 198000, utilization: 84, growth: "+24%" },
  { name: "Prime Poultry Solutions", revenue: 156000, utilization: 81, growth: "+21%" },
  { name: "Sunrise Farm Co.", revenue: 125000, utilization: 80, growth: "+18%" },
  { name: "Valley Poultry Ranch", revenue: 89000, utilization: 76, growth: "+15%" },
  { name: "Heritage Farms LLC", revenue: 45000, utilization: 50, growth: "-5%" }
];

export default function FarmsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredFarms = mockFarms.filter(farm => {
    const matchesSearch = farm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         farm.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         farm.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || farm.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      "Active": "bg-green-100 text-green-800 hover:bg-green-100",
      "Maintenance": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      "Inactive": "bg-red-100 text-red-800 hover:bg-red-100"
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getPerformanceBadge = (performance: string) => {
    const variants = {
      "Excellent": "bg-green-100 text-green-800 hover:bg-green-100",
      "Good": "bg-blue-100 text-blue-800 hover:bg-blue-100",
      "Needs Improvement": "bg-red-100 text-red-800 hover:bg-red-100"
    };
    return <Badge className={variants[performance as keyof typeof variants]}>{performance}</Badge>;
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // Calculate totals
  const totalCapacity = mockFarms.reduce((sum, farm) => sum + farm.capacity, 0);
  const totalCurrentBirds = mockFarms.reduce((sum, farm) => sum + farm.currentBirds, 0);
  const avgUtilization = Math.round(mockFarms.reduce((sum, farm) => sum + farm.utilizationRate, 0) / mockFarms.length);
  const totalRevenue = mockFarms.reduce((sum, farm) => sum + farm.totalRevenue, 0);

  return (
    <AdminLayout 
      title="Farm Analytics" 
      description="Farm performance comparison, capacity utilization, and analytics"
    >
      <div className="space-y-6">
        {/* Farm Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Farms</CardTitle>
              <Building2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockFarms.length}</div>
              <p className="text-xs text-green-600">+3.2% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCapacity.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">birds capacity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgUtilization}%</div>
              <p className="text-xs text-green-600">+2.1% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalRevenue / 1000)}K</div>
              <p className="text-xs text-green-600">+16.8% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Farm Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Farm Performance Comparison</span>
            </CardTitle>
            <CardDescription>
              Capacity utilization and revenue performance across all farms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockFarms.map((farm, index) => (
                <div key={farm.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{farm.name}</p>
                      <p className="text-sm text-muted-foreground">{farm.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Utilization</p>
                      <p className={`font-semibold ${getUtilizationColor(farm.utilizationRate)}`}>
                        {farm.utilizationRate}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="font-semibold">${farm.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Growth</p>
                      <p className={`font-semibold ${farm.monthlyGrowth.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {farm.monthlyGrowth}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Farms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-gold-600" />
              <span>Top Performing Farms</span>
            </CardTitle>
            <CardDescription>
              Farms ranked by revenue performance and efficiency metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topPerformingFarms.slice(0, 3).map((farm, index) => (
                <div key={index} className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <Badge className="bg-gold-100 text-gold-800">Top Performer</Badge>
                  </div>
                  <h3 className="font-semibold mb-2">{farm.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue:</span>
                      <span className="font-medium">${farm.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Utilization:</span>
                      <span className={`font-medium ${getUtilizationColor(farm.utilization)}`}>
                        {farm.utilization}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Growth:</span>
                      <span className={`font-medium ${farm.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {farm.growth}
                      </span>
                    </div>
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
                  Comprehensive list of all farms with capacity utilization and performance metrics
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
                <option value="maintenance">Maintenance</option>
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
                    <TableHead>Revenue</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>FCR</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFarms.map((farm) => (
                    <TableRow key={farm.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{farm.name}</div>
                          <div className="text-sm text-muted-foreground">{farm.totalBatches} batches</div>
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
                          <div className="w-12 h-2 bg-muted rounded-full">
                            <div 
                              className={`h-full rounded-full ${
                                farm.utilizationRate >= 80 ? 'bg-green-500' :
                                farm.utilizationRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${farm.utilizationRate}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${getUtilizationColor(farm.utilizationRate)}`}>
                            {farm.utilizationRate}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>${farm.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell>{getPerformanceBadge(farm.performance)}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${farm.avgFCR <= 1.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {farm.avgFCR}
                        </span>
                      </TableCell>
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
    </AdminLayout>
  );
}
