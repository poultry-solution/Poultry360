'use client';

import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  RefreshCw,
  Calendar,
  Award,
  DollarSign,
  Zap
} from 'lucide-react';
import { useState } from 'react';

// Mock performance data
const performanceOverview = {
  avgMortalityRate: 3.2,
  avgFCR: 1.52,
  avgProfitPerBird: 2.45,
  totalBirdsProcessed: 125000,
  industryMortalityBenchmark: 4.0,
  industryFCRBenchmark: 1.65,
  industryProfitBenchmark: 2.20
};

const farmPerformanceData = [
  {
    id: 1,
    farmName: "GreenFields Poultry",
    owner: "Emily Chen",
    mortalityRate: 2.1,
    fcr: 1.42,
    profitPerBird: 2.85,
    totalBirds: 25000,
    batchesCompleted: 12,
    avgWeight: 2.2,
    feedEfficiency: 95.2,
    performance: "Excellent",
    trend: "up"
  },
  {
    id: 2,
    farmName: "Sunrise Farm Co.",
    owner: "John Smith",
    mortalityRate: 3.2,
    fcr: 1.58,
    profitPerBird: 2.35,
    totalBirds: 18000,
    batchesCompleted: 8,
    avgWeight: 2.1,
    feedEfficiency: 88.5,
    performance: "Good",
    trend: "up"
  },
  {
    id: 3,
    farmName: "Valley Poultry Ranch",
    owner: "Sarah Johnson",
    mortalityRate: 2.8,
    fcr: 1.51,
    profitPerBird: 2.65,
    totalBirds: 15000,
    batchesCompleted: 6,
    avgWeight: 2.0,
    feedEfficiency: 91.8,
    performance: "Good",
    trend: "stable"
  },
  {
    id: 4,
    farmName: "Prime Poultry Solutions",
    owner: "Robert Wilson",
    mortalityRate: 2.5,
    fcr: 1.45,
    profitPerBird: 2.75,
    totalBirds: 22000,
    batchesCompleted: 10,
    avgWeight: 2.3,
    feedEfficiency: 93.7,
    performance: "Excellent",
    trend: "up"
  },
  {
    id: 5,
    farmName: "Heritage Farms LLC",
    owner: "Mike Davis",
    mortalityRate: 6.0,
    fcr: 1.75,
    profitPerBird: 1.45,
    totalBirds: 8000,
    batchesCompleted: 3,
    avgWeight: 1.8,
    feedEfficiency: 78.3,
    performance: "Needs Improvement",
    trend: "down"
  }
];

const monthlyTrends = [
  { month: "Jan 2024", mortality: 3.8, fcr: 1.58, profitPerBird: 2.25 },
  { month: "Feb 2024", mortality: 3.5, fcr: 1.55, profitPerBird: 2.32 },
  { month: "Mar 2024", mortality: 3.2, fcr: 1.53, profitPerBird: 2.38 },
  { month: "Apr 2024", mortality: 3.0, fcr: 1.51, profitPerBird: 2.42 },
  { month: "May 2024", mortality: 2.9, fcr: 1.50, profitPerBird: 2.46 },
  { month: "Jun 2024", mortality: 3.1, fcr: 1.52, profitPerBird: 2.44 },
  { month: "Jul 2024", mortality: 3.3, fcr: 1.53, profitPerBird: 2.41 },
  { month: "Aug 2024", mortality: 3.2, fcr: 1.52, profitPerBird: 2.45 },
  { month: "Sep 2024", mortality: 3.0, fcr: 1.51, profitPerBird: 2.48 }
];

export default function PerformancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");

  const getPerformanceBadge = (performance: string) => {
    const variants = {
      "Excellent": "bg-green-100 text-green-800 hover:bg-green-100",
      "Good": "bg-blue-100 text-blue-800 hover:bg-blue-100",
      "Needs Improvement": "bg-red-100 text-red-800 hover:bg-red-100"
    };
    return <Badge className={variants[performance as keyof typeof variants]}>{performance}</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (trend === "down") return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  const getMortalityColor = (rate: number) => {
    if (rate <= 3) return "text-green-600";
    if (rate <= 4) return "text-yellow-600";
    return "text-red-600";
  };

  const getFCRColor = (fcr: number) => {
    if (fcr <= 1.5) return "text-green-600";
    if (fcr <= 1.65) return "text-yellow-600";
    return "text-red-600";
  };

  const getProfitColor = (profit: number) => {
    if (profit >= 2.5) return "text-green-600";
    if (profit >= 2.0) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <AdminLayout 
      title="Performance Metrics" 
      description="Mortality rates, feed conversion ratios, and profit analytics"
    >
      <div className="space-y-6">
        {/* Performance Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Mortality Rate</CardTitle>
              <Activity className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceOverview.avgMortalityRate}%</div>
              <p className="text-xs text-green-600">
                {(performanceOverview.industryMortalityBenchmark - performanceOverview.avgMortalityRate).toFixed(1)}% 
                below industry avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg FCR</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceOverview.avgFCR}</div>
              <p className="text-xs text-green-600">
                {(performanceOverview.industryFCRBenchmark - performanceOverview.avgFCR).toFixed(2)} 
                better than industry
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Profit/Bird</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${performanceOverview.avgProfitPerBird}</div>
              <p className="text-xs text-green-600">
                +{(performanceOverview.avgProfitPerBird - performanceOverview.industryProfitBenchmark).toFixed(2)} 
                vs industry avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Birds Processed</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(performanceOverview.totalBirdsProcessed / 1000).toFixed(0)}K</div>
              <p className="text-xs text-green-600">Total across all farms</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Performance Trends</span>
                </CardTitle>
                <CardDescription>
                  Monthly trends for mortality rates, FCR, and profit per bird
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <select 
                  className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Chart Placeholder */}
              <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Performance Trends Chart</p>
                  <p className="text-sm text-muted-foreground">Chart visualization would be integrated here</p>
                </div>
              </div>

              {/* Recent Months Summary */}
              <div className="grid gap-2 md:grid-cols-3">
                {monthlyTrends.slice(-3).map((month, index) => (
                  <div key={index} className="p-4 rounded-lg border">
                    <h3 className="font-semibold text-sm mb-2">{month.month}</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mortality:</span>
                        <span className={`font-medium ${getMortalityColor(month.mortality)}`}>
                          {month.mortality}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FCR:</span>
                        <span className={`font-medium ${getFCRColor(month.fcr)}`}>
                          {month.fcr}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit/Bird:</span>
                        <span className={`font-medium ${getProfitColor(month.profitPerBird)}`}>
                          ${month.profitPerBird}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Farm Performance Comparison */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Mortality Rate Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-red-600" />
                <span>Mortality Rate Analysis</span>
              </CardTitle>
              <CardDescription>
                Farm-wise mortality rates compared to industry benchmark
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {farmPerformanceData
                  .sort((a, b) => a.mortalityRate - b.mortalityRate)
                  .map((farm, index) => (
                  <div key={farm.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold text-xs ${
                        farm.mortalityRate <= 3 ? 'bg-green-100 text-green-800' :
                        farm.mortalityRate <= 4 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{farm.farmName}</p>
                        <p className="text-xs text-muted-foreground">{farm.batchesCompleted} batches</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${getMortalityColor(farm.mortalityRate)}`}>
                        {farm.mortalityRate}%
                      </div>
                      <div className="flex items-center text-xs">
                        {getTrendIcon(farm.trend)}
                        <span className="ml-1">
                          {farm.mortalityRate <= performanceOverview.industryMortalityBenchmark ? 'Below' : 'Above'} benchmark
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FCR Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span>Feed Conversion Ratio</span>
              </CardTitle>
              <CardDescription>
                Feed efficiency across all farms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {farmPerformanceData
                  .sort((a, b) => a.fcr - b.fcr)
                  .map((farm, index) => (
                  <div key={farm.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold text-xs ${
                        farm.fcr <= 1.5 ? 'bg-green-100 text-green-800' :
                        farm.fcr <= 1.65 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{farm.farmName}</p>
                        <p className="text-xs text-muted-foreground">{farm.totalBirds.toLocaleString()} birds</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${getFCRColor(farm.fcr)}`}>
                        {farm.fcr}
                      </div>
                      <div className="flex items-center text-xs">
                        {getTrendIcon(farm.trend)}
                        <span className="ml-1">
                          {farm.fcr <= performanceOverview.industryFCRBenchmark ? 'Efficient' : 'Needs Work'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profit per Bird Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span>Profit per Bird Analytics</span>
            </CardTitle>
            <CardDescription>
              Profitability analysis across all farms with performance insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {farmPerformanceData
                .sort((a, b) => b.profitPerBird - a.profitPerBird)
                .map((farm, index) => (
                <div key={farm.id} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold text-xs ${
                      farm.profitPerBird >= 2.5 ? 'bg-green-100 text-green-800' :
                      farm.profitPerBird >= 2.0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {index + 1}
                    </div>
                    {getPerformanceBadge(farm.performance)}
                  </div>
                  <h3 className="font-semibold mb-2">{farm.farmName}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit/Bird:</span>
                      <span className={`font-medium ${getProfitColor(farm.profitPerBird)}`}>
                        ${farm.profitPerBird}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Weight:</span>
                      <span className="font-medium">{farm.avgWeight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Feed Efficiency:</span>
                      <span className="font-medium">{farm.feedEfficiency}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Birds:</span>
                      <span className="font-medium">{farm.totalBirds.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Performance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detailed Performance Analysis</CardTitle>
                <CardDescription>
                  Comprehensive performance metrics for all farms
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
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
                    <TableHead>Farm</TableHead>
                    <TableHead>Mortality Rate</TableHead>
                    <TableHead>FCR</TableHead>
                    <TableHead>Profit/Bird</TableHead>
                    <TableHead>Avg Weight</TableHead>
                    <TableHead>Feed Efficiency</TableHead>
                    <TableHead>Total Birds</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmPerformanceData.map((farm) => (
                    <TableRow key={farm.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{farm.farmName}</div>
                          <div className="text-sm text-muted-foreground">{farm.owner}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getMortalityColor(farm.mortalityRate)}`}>
                          {farm.mortalityRate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getFCRColor(farm.fcr)}`}>
                          {farm.fcr}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getProfitColor(farm.profitPerBird)}`}>
                          ${farm.profitPerBird}
                        </span>
                      </TableCell>
                      <TableCell>{farm.avgWeight} kg</TableCell>
                      <TableCell>
                        <span className={`font-medium ${farm.feedEfficiency >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {farm.feedEfficiency}%
                        </span>
                      </TableCell>
                      <TableCell>{farm.totalBirds.toLocaleString()}</TableCell>
                      <TableCell>{getPerformanceBadge(farm.performance)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getTrendIcon(farm.trend)}
                          <span className="ml-1 text-sm capitalize">{farm.trend}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Performance Summary */}
            <div className="grid gap-4 md:grid-cols-3 mt-6 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Industry Mortality Benchmark</p>
                <p className="text-xl font-bold text-red-600">{performanceOverview.industryMortalityBenchmark}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Industry FCR Benchmark</p>
                <p className="text-xl font-bold text-blue-600">{performanceOverview.industryFCRBenchmark}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Industry Profit Benchmark</p>
                <p className="text-xl font-bold text-green-600">${performanceOverview.industryProfitBenchmark}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
