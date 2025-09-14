'use client';

import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
} from 'lucide-react';
import { useState } from 'react';

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
    lastGenerated: "2024-09-08",
    status: "Active",
    downloads: 32,
    format: "Excel"
  },
  {
    id: 3,
    name: "Batch Completion Summary",
    description: "Summary of completed batches with profitability analysis",
    category: "Operations",
    frequency: "Bi-weekly",
    lastGenerated: "2024-09-05",
    status: "Active",
    downloads: 28,
    format: "PDF"
  },
  {
    id: 4,
    name: "Supplier Performance Report",
    description: "Supplier ratings, delivery performance, and cost analysis",
    category: "Supply Chain",
    frequency: "Monthly",
    lastGenerated: "2024-08-28",
    status: "Scheduled",
    downloads: 19,
    format: "Excel"
  },
  {
    id: 5,
    name: "User Activity Analytics",
    description: "Platform usage statistics and user engagement metrics",
    category: "Analytics",
    frequency: "Weekly",
    lastGenerated: "2024-09-10",
    status: "Active",
    downloads: 41,
    format: "Dashboard"
  }
];

const recentReports = [
  {
    id: 1,
    name: "September Revenue Analysis",
    type: "Revenue Report",
    generatedBy: "System",
    generatedAt: "2024-09-14 08:30",
    size: "2.4 MB",
    status: "Completed",
    downloads: 12
  },
  {
    id: 2,
    name: "Weekly Performance Summary",
    type: "Performance Report",
    generatedBy: "Admin User",
    generatedAt: "2024-09-13 14:15",
    size: "1.8 MB",
    status: "Completed",
    downloads: 8
  },
  {
    id: 3,
    name: "Batch Analysis Q3 2024",
    type: "Operations Report",
    generatedBy: "System",
    generatedAt: "2024-09-12 10:45",
    size: "3.1 MB",
    status: "Completed",
    downloads: 15
  },
  {
    id: 4,
    name: "Supplier Evaluation Report",
    type: "Supply Chain Report",
    generatedBy: "Admin User",
    generatedAt: "2024-09-11 16:20",
    size: "1.5 MB",
    status: "Processing",
    downloads: 0
  }
];

const analyticsData = {
  totalReports: 156,
  reportsThisMonth: 23,
  totalDownloads: 1247,
  avgGenerationTime: "2.3 mins",
  topCategory: "Financial Reports",
  mostDownloaded: "Monthly Revenue Report"
};

const trendData = [
  { period: "Jan 2024", reports: 18, downloads: 142 },
  { period: "Feb 2024", reports: 21, downloads: 156 },
  { period: "Mar 2024", reports: 19, downloads: 134 },
  { period: "Apr 2024", reports: 24, downloads: 178 },
  { period: "May 2024", reports: 22, downloads: 165 },
  { period: "Jun 2024", reports: 26, downloads: 189 },
  { period: "Jul 2024", reports: 25, downloads: 201 },
  { period: "Aug 2024", reports: 28, downloads: 218 },
  { period: "Sep 2024", reports: 23, downloads: 164 }
];

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");

  const getStatusBadge = (status: string) => {
    const variants = {
      "Active": { class: "bg-green-100 text-green-800 hover:bg-green-100", icon: CheckCircle },
      "Scheduled": { class: "bg-blue-100 text-blue-800 hover:bg-blue-100", icon: Clock },
      "Completed": { class: "bg-green-100 text-green-800 hover:bg-green-100", icon: CheckCircle },
      "Processing": { class: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100", icon: Clock },
      "Failed": { class: "bg-red-100 text-red-800 hover:bg-red-100", icon: AlertCircle }
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

  const getCategoryBadge = (category: string) => {
    const variants = {
      "Financial": "bg-green-100 text-green-800 hover:bg-green-100",
      "Performance": "bg-blue-100 text-blue-800 hover:bg-blue-100",
      "Operations": "bg-orange-100 text-orange-800 hover:bg-orange-100",
      "Supply Chain": "bg-purple-100 text-purple-800 hover:bg-purple-100",
      "Analytics": "bg-pink-100 text-pink-800 hover:bg-pink-100"
    };
    return <Badge className={variants[category as keyof typeof variants]}>{category}</Badge>;
  };

  return (
    <AdminLayout 
      title="Reports & Analytics" 
      description="Revenue reports, performance analysis, and trend insights"
    >
      <div className="space-y-6">
        {/* Analytics Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalReports}</div>
              <p className="text-xs text-green-600">+{analyticsData.reportsThisMonth} this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
              <Download className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalDownloads.toLocaleString()}</div>
              <p className="text-xs text-green-600">Across all reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Generation Time</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.avgGenerationTime}</div>
              <p className="text-xs text-green-600">15% faster than last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Category</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{analyticsData.topCategory}</div>
              <p className="text-xs text-green-600">Most requested</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Generation & Trends */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Report Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Quick Report Generation</span>
              </CardTitle>
              <CardDescription>
                Generate reports instantly with predefined templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Button className="w-full justify-start" variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Generate Revenue Report
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Performance Report
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Generate User Analytics
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Building2 className="h-4 w-4 mr-2" />
                    Generate Farm Summary
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Package className="h-4 w-4 mr-2" />
                    Generate Batch Report
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <Button className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Custom Report Builder
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trend Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Report Usage Trends</span>
              </CardTitle>
              <CardDescription>
                Monthly report generation and download trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Chart Placeholder */}
                <div className="h-48 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
                  <div className="text-center">
                    <LineChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Trend Chart</p>
                  </div>
                </div>

                {/* Recent Trends Summary */}
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Reports Generated</span>
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-lg font-bold">23</div>
                    <div className="text-xs text-green-600">+15% vs last month</div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Downloads</span>
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="text-lg font-bold">164</div>
                    <div className="text-xs text-red-600">-8% vs last month</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Report Templates</CardTitle>
                <CardDescription>
                  Manage and configure automated report templates
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <select 
                  className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="financial">Financial</option>
                  <option value="performance">Performance</option>
                  <option value="operations">Operations</option>
                  <option value="analytics">Analytics</option>
                </select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Generated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(template.category)}</TableCell>
                      <TableCell>{template.frequency}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{template.lastGenerated}</TableCell>
                      <TableCell>{getStatusBadge(template.status)}</TableCell>
                      <TableCell>{template.downloads}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.format}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>
                  Recently generated reports and their download status
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{report.name}</h3>
                      <p className="text-sm text-muted-foreground">{report.type}</p>
                      <p className="text-xs text-muted-foreground">
                        Generated by {report.generatedBy} • {report.generatedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{report.size}</div>
                      <div className="text-xs text-muted-foreground">{report.downloads} downloads</div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {getStatusBadge(report.status)}
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" disabled={report.status === "Processing"}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analytics Summary */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Report Categories Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-orange-600" />
                <span>Report Categories</span>
              </CardTitle>
              <CardDescription>
                Distribution of reports by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Financial Reports</span>
                    </div>
                    <span className="text-sm font-medium">45%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm">Performance Reports</span>
                    </div>
                    <span className="text-sm font-medium">28%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm">Operations Reports</span>
                    </div>
                    <span className="text-sm font-medium">18%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm">Analytics Reports</span>
                    </div>
                    <span className="text-sm font-medium">9%</span>
                  </div>
                </div>
                
                {/* Visual representation */}
                <div className="mt-4">
                  <div className="flex h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500" style={{ width: '45%' }}></div>
                    <div className="bg-blue-500" style={{ width: '28%' }}></div>
                    <div className="bg-orange-500" style={{ width: '18%' }}></div>
                    <div className="bg-purple-500" style={{ width: '9%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Performance Insights</span>
              </CardTitle>
              <CardDescription>
                Key metrics and insights from reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Revenue Growth</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Monthly revenue reports show consistent 15% growth over the last quarter
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Performance Improvement</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Farm performance metrics indicate 8% improvement in FCR across all operations
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-800">Attention Needed</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    Supplier performance reports highlight delivery delays in 12% of orders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
