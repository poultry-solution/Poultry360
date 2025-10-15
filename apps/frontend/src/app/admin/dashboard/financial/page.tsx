"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminFinancialPage() {
  const router = useRouter();

  // Mock financial data
  const financialStats = [
    {
      title: "Total Revenue",
      value: "$1.2M",
      change: "+18.7%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Monthly Revenue",
      value: "$156K",
      change: "+12.3%",
      trend: "up",
      icon: TrendingUp,
      color: "text-blue-600"
    },
    {
      title: "Total Expenses",
      value: "$89K",
      change: "+5.2%",
      trend: "up",
      icon: TrendingDown,
      color: "text-red-600"
    },
    {
      title: "Net Profit",
      value: "$67K",
      change: "+22.1%",
      trend: "up",
      icon: BarChart3,
      color: "text-purple-600"
    }
  ];

  const revenueByFarm = [
    { name: "GreenFields Poultry", revenue: 198000, percentage: 35.2, growth: "+24%" },
    { name: "Sunrise Farm Co.", revenue: 125000, percentage: 22.3, growth: "+18%" },
    { name: "Family Farm", revenue: 67000, percentage: 11.9, growth: "+12%" },
    { name: "Other Farms", revenue: 172000, percentage: 30.6, growth: "+15%" }
  ];

  const monthlyRevenue = [
    { month: "Jan", revenue: 120000 },
    { month: "Feb", revenue: 135000 },
    { month: "Mar", revenue: 142000 },
    { month: "Apr", revenue: 138000 },
    { month: "May", revenue: 156000 },
    { month: "Jun", revenue: 162000 },
    { month: "Jul", revenue: 148000 },
    { month: "Aug", revenue: 171000 },
    { month: "Sep", revenue: 156000 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Overview</h1>
          <p className="text-muted-foreground">
            Monitor revenue, expenses, and financial performance across all farms
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

      {/* Financial Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {financialStats.map((stat, index) => {
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

      {/* Revenue by Farm */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            <span>Revenue by Farm</span>
          </CardTitle>
          <CardDescription>
            Revenue distribution across all farms for the current period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueByFarm.map((farm, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{farm.name}</p>
                    <p className="text-sm text-muted-foreground">{farm.percentage}% of total</p>
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

      {/* Monthly Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            <span>Monthly Revenue Trend</span>
          </CardTitle>
          <CardDescription>
            Revenue performance over the last 9 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyRevenue.map((month, index) => {
              const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue));
              const percentage = (month.revenue / maxRevenue) * 100;
              
              return (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-12 text-sm font-medium">{month.month}</div>
                  <div className="flex-1">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm font-medium">
                    ${month.revenue.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Top Revenue Sources</span>
            </CardTitle>
            <CardDescription>
              Primary sources of revenue across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Poultry Sales</span>
                <span className="font-semibold">$856K (71.3%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Feed Sales</span>
                <span className="font-semibold">$234K (19.5%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Consultation Fees</span>
                <span className="font-semibold">$89K (7.4%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Other Services</span>
                <span className="font-semibold">$21K (1.8%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span>Expense Breakdown</span>
            </CardTitle>
            <CardDescription>
              Major expense categories for the current period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Feed Costs</span>
                <span className="font-semibold">$45K (50.6%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Labor</span>
                <span className="font-semibold">$23K (25.8%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Utilities</span>
                <span className="font-semibold">$12K (13.5%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Other</span>
                <span className="font-semibold">$9K (10.1%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-800">🚧 Enhanced Financial Features Coming Soon</CardTitle>
          <CardDescription className="text-amber-700">
            The financial system will be enhanced with:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Real-time financial data integration</li>
              <li>Advanced analytics and forecasting</li>
              <li>Automated financial reporting</li>
              <li>Profit/loss statements by farm</li>
              <li>Cash flow analysis and projections</li>
              <li>Integration with accounting systems</li>
            </ul>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
