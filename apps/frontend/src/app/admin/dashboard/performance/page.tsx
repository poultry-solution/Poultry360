"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/common/components/ui/table";
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
  Award,
  DollarSign,
  Zap
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    performance: "Excellent",
    growth: "+15%"
  },
  {
    id: 2,
    farmName: "Sunrise Farm Co.",
    owner: "John Smith",
    mortalityRate: 3.2,
    fcr: 1.48,
    profitPerBird: 2.65,
    totalBirds: 18000,
    batchesCompleted: 8,
    avgWeight: 2.1,
    performance: "Good",
    growth: "+8%"
  },
  {
    id: 3,
    farmName: "Family Farm",
    owner: "Robert Wilson",
    mortalityRate: 2.8,
    fcr: 1.45,
    profitPerBird: 2.75,
    totalBirds: 12000,
    batchesCompleted: 6,
    avgWeight: 2.3,
    performance: "Good",
    growth: "+12%"
  }
];

const topPerformers = [
  { farm: "GreenFields Poultry", metric: "Mortality Rate", value: "2.1%", benchmark: "4.0%", status: "excellent" },
  { farm: "Family Farm", metric: "FCR", value: "1.45", benchmark: "1.65", status: "excellent" },
  { farm: "GreenFields Poultry", metric: "Profit/Bird", value: "$2.85", benchmark: "$2.20", status: "excellent" }
];

export default function AdminPerformancePage() {
  const [timeRange, setTimeRange] = useState("30d");
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  const getPerformanceBadge = (performance: string) => {
    const variants = {
      "Excellent": "bg-green-100 text-green-800 hover:bg-green-100",
      "Good": "bg-blue-100 text-blue-800 hover:bg-blue-100", 
      "Average": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      "Poor": "bg-red-100 text-red-800 hover:bg-red-100"
    };
    return <Badge className={variants[performance as keyof typeof variants]}>{performance}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "good":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case "average":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Metrics</h1>
          <p className="text-muted-foreground">
            Monitor farm performance, efficiency metrics, and industry benchmarks
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => router.push("/admin/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Mortality Rate</CardTitle>
            <Activity className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceOverview.avgMortalityRate}%</div>
            <div className="flex items-center space-x-1">
              <ArrowDownRight className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">
                {performanceOverview.industryMortalityBenchmark - performanceOverview.avgMortalityRate}% below industry
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg FCR</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceOverview.avgFCR}</div>
            <div className="flex items-center space-x-1">
              <ArrowDownRight className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">
                {performanceOverview.industryFCRBenchmark - performanceOverview.avgFCR} below industry
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit/Bird</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${performanceOverview.avgProfitPerBird}</div>
            <div className="flex items-center space-x-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">
                ${(performanceOverview.avgProfitPerBird - performanceOverview.industryProfitBenchmark).toFixed(2)} above industry
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Birds Processed</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceOverview.totalBirdsProcessed.toLocaleString()}</div>
            <p className="text-xs text-green-600">+12.5% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-yellow-600" />
            <span>Top Performers</span>
          </CardTitle>
          <CardDescription>
            Farms exceeding industry benchmarks in key performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{performer.farm}</p>
                    <p className="text-sm text-muted-foreground">{performer.metric}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold">{performer.value}</p>
                    <p className="text-sm text-muted-foreground">vs {performer.benchmark} benchmark</p>
                  </div>
                  {getStatusIcon(performer.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Farm Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Farm Performance Analysis</CardTitle>
              <CardDescription>
                Detailed performance metrics for all farms with industry comparisons
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <select 
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
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
                  <TableHead>Farm</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Mortality Rate</TableHead>
                  <TableHead>FCR</TableHead>
                  <TableHead>Profit/Bird</TableHead>
                  <TableHead>Total Birds</TableHead>
                  <TableHead>Batches</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Growth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmPerformanceData.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{farm.farmName}</div>
                        <div className="text-sm text-muted-foreground">{farm.avgWeight}kg avg weight</div>
                      </div>
                    </TableCell>
                    <TableCell>{farm.owner}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{farm.mortalityRate}%</span>
                        {farm.mortalityRate < performanceOverview.industryMortalityBenchmark ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{farm.fcr}</span>
                        {farm.fcr < performanceOverview.industryFCRBenchmark ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">${farm.profitPerBird}</span>
                        {farm.profitPerBird > performanceOverview.industryProfitBenchmark ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{farm.totalBirds.toLocaleString()}</TableCell>
                    <TableCell>{farm.batchesCompleted}</TableCell>
                    <TableCell>{getPerformanceBadge(farm.performance)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-sm text-green-600">{farm.growth}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <span>Performance Insights</span>
            </CardTitle>
            <CardDescription>
              Key insights and recommendations based on performance data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Excellent Performance</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Overall mortality rate is 20% below industry average
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Improvement Opportunity</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  FCR can be optimized further in 3 farms to reach industry-leading levels
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Focus Area</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Profit per bird shows strong growth potential with feed optimization
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              <span>Performance Distribution</span>
            </CardTitle>
            <CardDescription>
              Distribution of farms across performance categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Excellent</span>
                </div>
                <span className="font-semibold">1 farm (33%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">Good</span>
                </div>
                <span className="font-semibold">2 farms (67%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Average</span>
                </div>
                <span className="font-semibold">0 farms (0%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">Poor</span>
                </div>
                <span className="font-semibold">0 farms (0%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
