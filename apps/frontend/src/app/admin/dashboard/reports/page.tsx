"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/common/components/ui/table";
import { 
  FileText, 
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  PieChart,
  LineChart,
  Eye,
  Share,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Building2,
  Package,
  DollarSign
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Mock reports data
const reportTemplates = [
  {
    id: 1,
    name: "Monthly Revenue Report",
    description: "Comprehensive monthly revenue analysis across all farms",
    category: "Financial",
    frequency: "Monthly",
    lastGenerated: "2024-09-01",
    status: "Active",
    downloads: 45,
    format: "PDF"
  },
  {
    id: 2,
    name: "Farm Performance Analysis",
    description: "Detailed performance metrics including FCR and mortality rates",
    category: "Performance",
    frequency: "Weekly",
    lastGenerated: "2024-09-14",
    status: "Active",
    downloads: 32,
    format: "Excel"
  },
  {
    id: 3,
    name: "User Activity Summary",
    description: "User engagement and activity patterns across the platform",
    category: "Analytics",
    frequency: "Daily",
    lastGenerated: "2024-09-15",
    status: "Active",
    downloads: 28,
    format: "PDF"
  },
  {
    id: 4,
    name: "Batch Completion Report",
    description: "Batch lifecycle tracking and completion statistics",
    category: "Operations",
    frequency: "Weekly",
    lastGenerated: "2024-09-13",
    status: "Active",
    downloads: 19,
    format: "Excel"
  },
  {
    id: 5,
    name: "System Health Dashboard",
    description: "Platform performance and system health metrics",
    category: "Technical",
    frequency: "Daily",
    lastGenerated: "2024-09-15",
    status: "Active",
    downloads: 12,
    format: "PDF"
  }
];

const recentReports = [
  {
    id: 1,
    name: "Monthly Revenue Report - September 2024",
    type: "Financial",
    generatedAt: "2024-09-01T10:30:00Z",
    size: "2.4 MB",
    status: "Completed",
    downloads: 8
  },
  {
    id: 2,
    name: "Farm Performance Analysis - Week 37",
    type: "Performance",
    generatedAt: "2024-09-14T14:15:00Z",
    size: "1.8 MB",
    status: "Completed",
    downloads: 5
  },
  {
    id: 3,
    name: "User Activity Summary - September 15",
    type: "Analytics",
    generatedAt: "2024-09-15T09:00:00Z",
    size: "3.2 MB",
    status: "Completed",
    downloads: 3
  }
];

const reportStats = [
  {
    title: "Total Reports Generated",
    value: "1,247",
    change: "+12.5%",
    trend: "up",
    icon: FileText,
    color: "text-blue-600"
  },
  {
    title: "Active Templates",
    value: "15",
    change: "+2",
    trend: "up",
    icon: BarChart3,
    color: "text-green-600"
  },
  {
    title: "Total Downloads",
    value: "3,456",
    change: "+18.2%",
    trend: "up",
    icon: Download,
    color: "text-purple-600"
  },
  {
    title: "Avg Generation Time",
    value: "2.3 min",
    change: "-0.5 min",
    trend: "down",
    icon: Clock,
    color: "text-orange-600"
  }
];

export default function AdminReportsPage() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const router = useRouter();

  const filteredReports = reportTemplates.filter(report => {
    const matchesCategory = categoryFilter === "all" || report.category.toLowerCase() === categoryFilter;
    const matchesStatus = statusFilter === "all" || report.status.toLowerCase() === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    return status === "Active" 
      ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
      : <Badge variant="secondary">Inactive</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Financial":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case "Performance":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case "Analytics":
        return <BarChart3 className="h-4 w-4 text-purple-600" />;
      case "Operations":
        return <Package className="h-4 w-4 text-orange-600" />;
      case "Technical":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate, manage, and analyze comprehensive reports across all platform data
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
          <Button onClick={() => router.push("/admin/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Report Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {reportStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center space-x-1">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                  )}
                  <p className={`text-xs ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {stat.change} from last month
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span>Recently Generated Reports</span>
          </CardTitle>
          <CardDescription>
            Latest reports generated across all categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.generatedAt).toLocaleDateString()} • {report.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{report.downloads} downloads</p>
                    <p className="text-sm text-muted-foreground">{report.type}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Report Templates</CardTitle>
              <CardDescription>
                Manage and configure automated report generation templates
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <select 
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="financial">Financial</option>
                <option value="performance">Performance</option>
                <option value="analytics">Analytics</option>
                <option value="operations">Operations</option>
                <option value="technical">Technical</option>
              </select>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Last Generated</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.name}</div>
                        <div className="text-sm text-muted-foreground">{report.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(report.category)}
                        <span>{report.category}</span>
                      </div>
                    </TableCell>
                    <TableCell>{report.frequency}</TableCell>
                    <TableCell>{new Date(report.lastGenerated).toLocaleDateString()}</TableCell>
                    <TableCell>{report.downloads}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Generate Custom Report</span>
            </CardTitle>
            <CardDescription>
              Create a custom report with specific data filters and metrics
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <span>Schedule Reports</span>
            </CardTitle>
            <CardDescription>
              Set up automated report generation and delivery schedules
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              <span>Analytics Dashboard</span>
            </CardTitle>
            <CardDescription>
              Access real-time analytics and interactive data visualizations
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
