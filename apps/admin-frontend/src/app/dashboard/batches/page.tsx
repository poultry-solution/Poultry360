'use client';

import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Package, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  BarChart3,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { useState } from 'react';

// Mock batch data
const mockBatches = [
  {
    id: 1,
    batchNumber: "BT-2024-001",
    farmName: "GreenFields Poultry",
    farmOwner: "Emily Chen",
    status: "Active",
    startDate: "2024-08-15",
    expectedEndDate: "2024-10-15",
    currentAge: 30,
    totalDays: 61,
    initialBirds: 5000,
    currentBirds: 4890,
    mortalityRate: 2.2,
    feedConsumed: 8500,
    fcr: 1.42,
    avgWeight: 1.8,
    revenue: 24500,
    expenses: 18200,
    profit: 6300,
    performance: "Excellent"
  },
  {
    id: 2,
    batchNumber: "BT-2024-002",
    farmName: "Sunrise Farm Co.",
    farmOwner: "John Smith",
    status: "Completed",
    startDate: "2024-07-01",
    expectedEndDate: "2024-09-01",
    currentAge: 61,
    totalDays: 61,
    initialBirds: 3500,
    currentBirds: 3360,
    mortalityRate: 4.0,
    feedConsumed: 7200,
    fcr: 1.58,
    avgWeight: 2.1,
    revenue: 28400,
    expenses: 19800,
    profit: 8600,
    performance: "Good"
  },
  {
    id: 3,
    batchNumber: "BT-2024-003",
    farmName: "Valley Poultry Ranch",
    farmOwner: "Sarah Johnson",
    status: "Active",
    startDate: "2024-08-20",
    expectedEndDate: "2024-10-20",
    currentAge: 25,
    totalDays: 61,
    initialBirds: 2500,
    currentBirds: 2430,
    mortalityRate: 2.8,
    feedConsumed: 4100,
    fcr: 1.51,
    avgWeight: 1.2,
    revenue: 0,
    expenses: 8900,
    profit: -8900,
    performance: "Good"
  },
  {
    id: 4,
    batchNumber: "BT-2024-004",
    farmName: "Heritage Farms LLC",
    farmOwner: "Mike Davis",
    status: "On Hold",
    startDate: "2024-08-10",
    expectedEndDate: "2024-10-10",
    currentAge: 35,
    totalDays: 61,
    initialBirds: 1800,
    currentBirds: 1692,
    mortalityRate: 6.0,
    feedConsumed: 3200,
    fcr: 1.75,
    avgWeight: 1.5,
    revenue: 0,
    expenses: 6800,
    profit: -6800,
    performance: "Needs Improvement"
  },
  {
    id: 5,
    batchNumber: "BT-2024-005",
    farmName: "Prime Poultry Solutions",
    farmOwner: "Robert Wilson",
    status: "Active",
    startDate: "2024-08-25",
    expectedEndDate: "2024-10-25",
    currentAge: 20,
    totalDays: 61,
    initialBirds: 4200,
    currentBirds: 4095,
    mortalityRate: 2.5,
    feedConsumed: 5800,
    fcr: 1.45,
    avgWeight: 1.0,
    revenue: 0,
    expenses: 12400,
    profit: -12400,
    performance: "Excellent"
  },
  {
    id: 6,
    batchNumber: "BT-2024-006",
    farmName: "GreenFields Poultry",
    farmOwner: "Emily Chen",
    status: "Planning",
    startDate: "2024-10-01",
    expectedEndDate: "2024-12-01",
    currentAge: 0,
    totalDays: 61,
    initialBirds: 5000,
    currentBirds: 5000,
    mortalityRate: 0,
    feedConsumed: 0,
    fcr: 0,
    avgWeight: 0,
    revenue: 0,
    expenses: 0,
    profit: 0,
    performance: "Planning"
  }
];

export default function BatchesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredBatches = mockBatches.filter(batch => {
    const matchesSearch = batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.farmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.farmOwner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || batch.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      "Active": { class: "bg-green-100 text-green-800 hover:bg-green-100", icon: PlayCircle },
      "Completed": { class: "bg-blue-100 text-blue-800 hover:bg-blue-100", icon: CheckCircle },
      "On Hold": { class: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100", icon: PauseCircle },
      "Planning": { class: "bg-gray-100 text-gray-800 hover:bg-gray-100", icon: Clock }
    };
    const variant = variants[status as keyof typeof variants];
    const Icon = variant.icon;
    return (
      <Badge className={variant.class}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getPerformanceBadge = (performance: string) => {
    const variants = {
      "Excellent": "bg-green-100 text-green-800 hover:bg-green-100",
      "Good": "bg-blue-100 text-blue-800 hover:bg-blue-100",
      "Needs Improvement": "bg-red-100 text-red-800 hover:bg-red-100",
      "Planning": "bg-gray-100 text-gray-800 hover:bg-gray-100"
    };
    return <Badge className={variants[performance as keyof typeof variants]}>{performance}</Badge>;
  };

  const getProgressPercentage = (currentAge: number, totalDays: number) => {
    return Math.min((currentAge / totalDays) * 100, 100);
  };

  // Calculate statistics
  const activeBatches = mockBatches.filter(b => b.status === "Active").length;
  const completedBatches = mockBatches.filter(b => b.status === "Completed").length;
  const totalBirds = mockBatches.reduce((sum, batch) => sum + batch.currentBirds, 0);
  const avgMortality = mockBatches.filter(b => b.status !== "Planning").reduce((sum, batch) => sum + batch.mortalityRate, 0) / mockBatches.filter(b => b.status !== "Planning").length;

  return (
    <AdminLayout 
      title="Batch Management" 
      description="Batch performance metrics, timeline management, and analytics"
    >
      <div className="space-y-6">
        {/* Batch Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeBatches}</div>
              <p className="text-xs text-green-600">Currently in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Batches</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedBatches}</div>
              <p className="text-xs text-blue-600">Successfully finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Birds</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBirds.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all batches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Mortality</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMortality.toFixed(1)}%</div>
              <p className="text-xs text-green-600">Within target range</p>
            </CardContent>
          </Card>
        </div>

        {/* Batch Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <span>Batch Performance Metrics</span>
            </CardTitle>
            <CardDescription>
              Key performance indicators for all active and completed batches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mockBatches.filter(batch => batch.status !== "Planning").slice(0, 6).map((batch) => (
                <div key={batch.id} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{batch.batchNumber}</h3>
                    {getStatusBadge(batch.status)}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Farm:</span>
                      <span className="font-medium">{batch.farmName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Age:</span>
                      <span className="font-medium">{batch.currentAge} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Birds:</span>
                      <span className="font-medium">{batch.currentBirds.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mortality:</span>
                      <span className={`font-medium ${batch.mortalityRate <= 3 ? 'text-green-600' : 'text-red-600'}`}>
                        {batch.mortalityRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FCR:</span>
                      <span className={`font-medium ${batch.fcr <= 1.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {batch.fcr}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Interactive Batch Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Interactive Batch Timeline</span>
            </CardTitle>
            <CardDescription>
              Visual timeline showing batch progress and key milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {mockBatches.filter(batch => batch.status !== "Planning").map((batch) => {
                const progress = getProgressPercentage(batch.currentAge, batch.totalDays);
                return (
                  <div key={batch.id} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium">{batch.batchNumber}</h3>
                        {getStatusBadge(batch.status)}
                        <span className="text-sm text-muted-foreground">{batch.farmName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Day {batch.currentAge} of {batch.totalDays}
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="w-full h-3 bg-muted rounded-full">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            batch.status === "Completed" ? 'bg-blue-500' :
                            batch.status === "Active" ? 'bg-green-500' :
                            'bg-yellow-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      
                      {/* Timeline markers */}
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>Start</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>End</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mt-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Started:</span>
                        <div className="font-medium">{batch.startDate}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expected End:</span>
                        <div className="font-medium">{batch.expectedEndDate}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Progress:</span>
                        <div className="font-medium">{progress.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Performance:</span>
                        <div className="font-medium">{batch.performance}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* All Batches Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Batches</CardTitle>
                <CardDescription>
                  Comprehensive list of all batches with performance metrics and timeline data
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Batch
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
                  placeholder="Search batches by number, farm, or owner..."
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
                <option value="on hold">On Hold</option>
                <option value="planning">Planning</option>
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
                    <TableHead>Progress</TableHead>
                    <TableHead>Birds</TableHead>
                    <TableHead>Mortality</TableHead>
                    <TableHead>FCR</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => {
                    const progress = getProgressPercentage(batch.currentAge, batch.totalDays);
                    return (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{batch.batchNumber}</div>
                            <div className="text-sm text-muted-foreground">Day {batch.currentAge}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{batch.farmName}</div>
                            <div className="text-sm text-muted-foreground">{batch.farmOwner}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-muted rounded-full">
                              <div 
                                className={`h-full rounded-full ${
                                  batch.status === "Completed" ? 'bg-blue-500' :
                                  batch.status === "Active" ? 'bg-green-500' :
                                  batch.status === "Planning" ? 'bg-gray-500' :
                                  'bg-yellow-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{batch.currentBirds.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">of {batch.initialBirds.toLocaleString()}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${batch.mortalityRate <= 3 ? 'text-green-600' : batch.mortalityRate <= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {batch.mortalityRate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${batch.fcr <= 1.5 ? 'text-green-600' : batch.fcr <= 1.7 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {batch.fcr || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${batch.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${batch.profit.toLocaleString()}
                          </span>
                        </TableCell>
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
                    );
                  })}
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
    </AdminLayout>
  );
}
