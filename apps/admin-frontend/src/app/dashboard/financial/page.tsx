'use client';

import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PieChart,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  RefreshCw,
  Target,
  CreditCard,
  Wallet
} from 'lucide-react';
import { useState } from 'react';

// Mock financial data
const monthlyFinancials = [
  {
    month: "January 2024",
    revenue: 145000,
    expenses: 98000,
    profit: 47000,
    profitMargin: 32.4,
    growth: 12.5
  },
  {
    month: "February 2024",
    revenue: 162000,
    expenses: 105000,
    profit: 57000,
    profitMargin: 35.2,
    growth: 11.7
  },
  {
    month: "March 2024",
    revenue: 178000,
    expenses: 118000,
    profit: 60000,
    profitMargin: 33.7,
    growth: 9.9
  },
  {
    month: "April 2024",
    revenue: 195000,
    expenses: 128000,
    profit: 67000,
    profitMargin: 34.4,
    growth: 9.6
  },
  {
    month: "May 2024",
    revenue: 210000,
    expenses: 135000,
    profit: 75000,
    profitMargin: 35.7,
    growth: 7.7
  },
  {
    month: "June 2024",
    revenue: 225000,
    expenses: 142000,
    profit: 83000,
    profitMargin: 36.9,
    growth: 7.1
  },
  {
    month: "July 2024",
    revenue: 240000,
    expenses: 155000,
    profit: 85000,
    profitMargin: 35.4,
    growth: 6.7
  },
  {
    month: "August 2024",
    revenue: 255000,
    expenses: 168000,
    profit: 87000,
    profitMargin: 34.1,
    growth: 6.3
  },
  {
    month: "September 2024",
    revenue: 268000,
    expenses: 175000,
    profit: 93000,
    profitMargin: 34.7,
    growth: 5.1
  }
];

const expenseBreakdown = [
  { category: "Feed Costs", amount: 85000, percentage: 48.6, color: "bg-red-500" },
  { category: "Labor", amount: 28000, percentage: 16.0, color: "bg-blue-500" },
  { category: "Utilities", amount: 15000, percentage: 8.6, color: "bg-green-500" },
  { category: "Medical/Vaccines", amount: 12000, percentage: 6.9, color: "bg-yellow-500" },
  { category: "Equipment", amount: 18000, percentage: 10.3, color: "bg-purple-500" },
  { category: "Other", amount: 17000, percentage: 9.7, color: "bg-gray-500" }
];

const farmProfitability = [
  {
    farmName: "GreenFields Poultry",
    owner: "Emily Chen",
    revenue: 198000,
    expenses: 142000,
    profit: 56000,
    profitMargin: 28.3,
    trend: "up"
  },
  {
    farmName: "Prime Poultry Solutions",
    owner: "Robert Wilson",
    revenue: 156000,
    expenses: 115000,
    profit: 41000,
    profitMargin: 26.3,
    trend: "up"
  },
  {
    farmName: "Sunrise Farm Co.",
    owner: "John Smith",
    revenue: 125000,
    expenses: 95000,
    profit: 30000,
    profitMargin: 24.0,
    trend: "up"
  },
  {
    farmName: "Valley Poultry Ranch",
    owner: "Sarah Johnson",
    revenue: 89000,
    expenses: 72000,
    profit: 17000,
    profitMargin: 19.1,
    trend: "stable"
  },
  {
    farmName: "Heritage Farms LLC",
    owner: "Mike Davis",
    revenue: 45000,
    expenses: 52000,
    profit: -7000,
    profitMargin: -15.6,
    trend: "down"
  }
];

export default function FinancialPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");

  // Calculate totals
  const currentMonth = monthlyFinancials[monthlyFinancials.length - 1];
  const previousMonth = monthlyFinancials[monthlyFinancials.length - 2];
  const totalRevenue = monthlyFinancials.reduce((sum, month) => sum + month.revenue, 0);
  const totalExpenses = monthlyFinancials.reduce((sum, month) => sum + month.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const avgProfitMargin = monthlyFinancials.reduce((sum, month) => sum + month.profitMargin, 0) / monthlyFinancials.length;

  const revenueGrowth = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100);
  const expenseGrowth = ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses * 100);
  const profitGrowth = ((currentMonth.profit - previousMonth.profit) / previousMonth.profit * 100);

  return (
    <AdminLayout 
      title="Financial Overview" 
      description="Revenue analysis, profit tracking, and financial trends"
    >
      <div className="space-y-6">
        {/* Financial Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalRevenue / 1000).toFixed(0)}K</div>
              <p className={`text-xs flex items-center ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {Math.abs(revenueGrowth).toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <CreditCard className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalExpenses / 1000).toFixed(0)}K</div>
              <p className={`text-xs flex items-center ${expenseGrowth >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {expenseGrowth >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {Math.abs(expenseGrowth).toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalProfit / 1000).toFixed(0)}K</div>
              <p className={`text-xs flex items-center ${profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitGrowth >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {Math.abs(profitGrowth).toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgProfitMargin.toFixed(1)}%</div>
              <p className="text-xs text-green-600">Above industry average</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Revenue Trends</span>
                </CardTitle>
                <CardDescription>
                  Monthly revenue, expenses, and profit analysis over time
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
              {/* Chart Placeholder - Would integrate with actual charting library */}
              <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-muted">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Revenue Trend Chart</p>
                  <p className="text-sm text-muted-foreground">Chart visualization would be integrated here</p>
                </div>
              </div>

              {/* Monthly Data Table */}
              <div className="grid gap-2 md:grid-cols-3">
                {monthlyFinancials.slice(-3).map((month, index) => (
                  <div key={index} className="p-4 rounded-lg border">
                    <h3 className="font-semibold text-sm mb-2">{month.month}</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Revenue:</span>
                        <span className="font-medium text-green-600">${month.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expenses:</span>
                        <span className="font-medium text-red-600">${month.expenses.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit:</span>
                        <span className="font-medium text-blue-600">${month.profit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Margin:</span>
                        <span className="font-medium">{month.profitMargin.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown & Farm Profitability */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-orange-600" />
                <span>Expense Breakdown</span>
              </CardTitle>
              <CardDescription>
                Current month expense distribution by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenseBreakdown.map((expense, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${expense.color}`}></div>
                      <span className="text-sm font-medium">{expense.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">${expense.amount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{expense.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Visual representation */}
              <div className="mt-4">
                <div className="flex h-2 rounded-full overflow-hidden">
                  {expenseBreakdown.map((expense, index) => (
                    <div 
                      key={index}
                      className={expense.color}
                      style={{ width: `${expense.percentage}%` }}
                    ></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Profitable Farms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Farm Profitability</span>
              </CardTitle>
              <CardDescription>
                Profit analysis by individual farms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {farmProfitability.map((farm, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{farm.farmName}</p>
                        <p className="text-xs text-muted-foreground">{farm.owner}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${farm.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.abs(farm.profit).toLocaleString()}
                      </div>
                      <div className="flex items-center text-xs">
                        {farm.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600 mr-1" />}
                        {farm.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600 mr-1" />}
                        <span className={farm.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {farm.profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Financial Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detailed Financial Analysis</CardTitle>
                <CardDescription>
                  Monthly breakdown of revenue, expenses, and profit margins
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
                    <TableHead>Period</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Growth</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyFinancials.map((month, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{month.month}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          ${month.revenue.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-red-600">
                          ${month.expenses.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${month.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          ${month.profit.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${month.profitMargin >= 30 ? 'text-green-600' : month.profitMargin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {month.profitMargin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {month.growth >= 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
                          )}
                          <span className={`font-medium ${month.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {month.growth.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={
                          month.profitMargin >= 30 ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                          month.profitMargin >= 20 ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                          'bg-red-100 text-red-800 hover:bg-red-100'
                        }>
                          {month.profitMargin >= 30 ? 'Excellent' : month.profitMargin >= 20 ? 'Good' : 'Needs Improvement'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Financial Summary */}
            <div className="grid gap-4 md:grid-cols-3 mt-6 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">YTD Revenue</p>
                <p className="text-xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">YTD Expenses</p>
                <p className="text-xl font-bold text-red-600">${totalExpenses.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">YTD Profit</p>
                <p className="text-xl font-bold text-blue-600">${totalProfit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
