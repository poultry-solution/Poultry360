'use client';

import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Truck, 
  Building, 
  Heart,
  MapPin,
  Mail,
  Star,
  TrendingUp,
  Package,
  Search, 
  Filter, 
  Download, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useState } from 'react';

// Mock data
const mockDealers = [
  {
    id: 1,
    name: "Premium Feed Solutions",
    type: "Feed Dealer",
    location: "California, USA",
    email: "sales@premiumfeed.com",
    status: "Active",
    rating: 4.8,
    totalOrders: 156,
    totalValue: 245000,
    performance: "Excellent"
  },
  {
    id: 2,
    name: "AgriSupply Co.",
    type: "Equipment Dealer", 
    location: "Texas, USA",
    email: "info@agrisupply.com",
    status: "Active",
    rating: 4.5,
    totalOrders: 89,
    totalValue: 180000,
    performance: "Good"
  }
];

const mockHatcheries = [
  {
    id: 1,
    name: "Golden Chick Hatchery",
    location: "Arkansas, USA",
    email: "orders@goldenchick.com",
    status: "Active",
    rating: 4.9,
    capacity: 50000,
    utilizationRate: 90,
    performance: "Excellent",
    qualityScore: 98.5
  }
];

const mockMedicalSuppliers = [
  {
    id: 1,
    name: "VetCare Solutions",
    type: "Veterinary Medicines",
    location: "New York, USA",
    email: "orders@vetcare.com",
    status: "Active",
    rating: 4.7,
    totalOrders: 78,
    totalValue: 125000,
    performance: "Excellent",
    certifications: ["FDA", "USDA", "GMP"]
  }
];

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState("dealers");

  const getStatusBadge = (status: string) => {
    const variants = {
      "Active": { class: "bg-green-100 text-green-800 hover:bg-green-100", icon: CheckCircle },
      "Inactive": { class: "bg-red-100 text-red-800 hover:bg-red-100", icon: AlertTriangle },
      "Pending": { class: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100", icon: Clock }
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
      "Average": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    };
    return <Badge className={variants[performance as keyof typeof variants]}>{performance}</Badge>;
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < Math.floor(rating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <AdminLayout 
      title="Supplier Analytics" 
      description="Manage dealers, hatcheries, and medical suppliers"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dealers</CardTitle>
              <Truck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockDealers.length}</div>
              <p className="text-xs text-green-600">Active dealers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hatcheries</CardTitle>
              <Building className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockHatcheries.length}</div>
              <p className="text-xs text-green-600">All active partners</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medical Suppliers</CardTitle>
              <Heart className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockMedicalSuppliers.length}</div>
              <p className="text-xs text-green-600">Healthcare partners</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">323</div>
              <p className="text-xs text-green-600">Across all suppliers</p>
            </CardContent>
          </Card>
        </div>

        {/* Supplier Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Supplier Management</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("dealers")}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "dealers" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Truck className="h-4 w-4" />
                <span>Dealers</span>
              </button>
              <button
                onClick={() => setActiveTab("hatcheries")}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "hatcheries" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building className="h-4 w-4" />
                <span>Hatcheries</span>
              </button>
              <button
                onClick={() => setActiveTab("medical")}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "medical" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className="h-4 w-4" />
                <span>Medical</span>
              </button>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Dealers Tab */}
            {activeTab === "dealers" && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockDealers.map((dealer) => (
                      <TableRow key={dealer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{dealer.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {dealer.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{dealer.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{dealer.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(dealer.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {getRatingStars(dealer.rating)}
                            <span className="text-sm font-medium ml-1">{dealer.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell>{dealer.totalOrders}</TableCell>
                        <TableCell>${dealer.totalValue.toLocaleString()}</TableCell>
                        <TableCell>{getPerformanceBadge(dealer.performance)}</TableCell>
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
            )}

            {/* Hatcheries Tab */}
            {activeTab === "hatcheries" && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hatchery</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Quality Score</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockHatcheries.map((hatchery) => (
                      <TableRow key={hatchery.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{hatchery.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {hatchery.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{hatchery.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(hatchery.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {getRatingStars(hatchery.rating)}
                            <span className="text-sm font-medium ml-1">{hatchery.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{hatchery.capacity.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">weekly capacity</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-12 h-2 bg-muted rounded-full">
                              <div 
                                className="h-full rounded-full bg-green-500"
                                style={{ width: `${hatchery.utilizationRate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{hatchery.utilizationRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            {hatchery.qualityScore}%
                          </span>
                        </TableCell>
                        <TableCell>{getPerformanceBadge(hatchery.performance)}</TableCell>
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
            )}

            {/* Medical Suppliers Tab */}
            {activeTab === "medical" && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Certifications</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockMedicalSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {supplier.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{supplier.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{supplier.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {getRatingStars(supplier.rating)}
                            <span className="text-sm font-medium ml-1">{supplier.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{supplier.totalOrders}</div>
                            <div className="text-sm text-muted-foreground">${supplier.totalValue.toLocaleString()}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {supplier.certifications.map((cert, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {cert}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{getPerformanceBadge(supplier.performance)}</TableCell>
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
            )}
          </CardContent>
        </Card>

        {/* Top Suppliers Performance */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Top Performing Dealers</span>
              </CardTitle>
              <CardDescription>
                Dealers ranked by order value and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockDealers.map((dealer, index) => (
                  <div key={dealer.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{dealer.name}</p>
                        <p className="text-xs text-muted-foreground">{dealer.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">${dealer.totalValue.toLocaleString()}</div>
                      <div className="flex items-center text-xs">
                        {getRatingStars(dealer.rating).slice(0, 1)}
                        <span className="ml-1">{dealer.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-orange-600" />
                <span>Hatchery Performance</span>
              </CardTitle>
              <CardDescription>
                Hatcheries ranked by capacity utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockHatcheries.map((hatchery, index) => (
                  <div key={hatchery.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{hatchery.name}</p>
                        <p className="text-xs text-muted-foreground">Multiple breeds</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{hatchery.utilizationRate}%</div>
                      <div className="flex items-center text-xs">
                        {getRatingStars(hatchery.rating).slice(0, 1)}
                        <span className="ml-1">{hatchery.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
