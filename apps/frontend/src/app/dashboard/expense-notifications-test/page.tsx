"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGetAllFarms } from "@/fetchers/farms/farmQueries";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AlertTriangle, CheckCircle, XCircle, TestTube, TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { DateDisplay } from "@/components/ui/date-display";

interface ExpenseStats {
  farmId: string;
  farmName: string;
  totalExpenses: number;
  dailyExpenses: number;
  monthlyExpenses: number;
  averageDailyExpense: number;
  averageMonthlyExpense: number;
  expenseTrend: 'increasing' | 'decreasing' | 'stable' | 'no_data';
  thresholdStatus: 'normal' | 'high_daily' | 'high_monthly' | 'unusual_spending' | 'high_single';
  recentExpenses: Array<{
    id: string;
    amount: number;
    categoryName: string;
    date: string;
    description?: string;
  }>;
}

interface ExpenseCheckResult {
  checked: boolean;
  notificationsSent: number;
  stats: ExpenseStats;
  thresholdExceeded: 'none' | 'high_daily' | 'high_monthly' | 'unusual_spending' | 'high_single';
}

export default function ExpenseNotificationsTestPage() {
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [farmStats, setFarmStats] = useState<ExpenseStats | null>(null);
  const [checkResult, setCheckResult] = useState<ExpenseCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: farmsResponse } = useGetAllFarms();
  const allFarms = (farmsResponse?.data || []) as any[];

  // Load farm stats when a farm is selected
  useEffect(() => {
    if (selectedFarmId) {
      loadFarmStats(selectedFarmId);
    } else {
      setFarmStats(null);
    }
  }, [selectedFarmId]);

  const loadFarmStats = async (farmId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`/expense-notifications/farm/${farmId}/stats`);
      setFarmStats(response.data.data);
    } catch (error: any) {
      console.error('Failed to load farm expense stats:', error);
      setError(error.response?.data?.error || 'Failed to load farm expense statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const checkExpensePatterns = async () => {
    if (!selectedFarmId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`/expense-notifications/farm/${selectedFarmId}/check`);
      setCheckResult(response.data.data);
      
      // Reload stats after check
      await loadFarmStats(selectedFarmId);
    } catch (error: any) {
      console.error('Failed to check expense patterns:', error);
      setError(error.response?.data?.error || 'Failed to check expense patterns');
    } finally {
      setIsLoading(false);
    }
  };

  const testExpenseNotification = async () => {
    if (!selectedFarmId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.post(`/expense-notifications/farm/${selectedFarmId}/test`);
      
      if (response.data.success) {
        alert('Test notification sent successfully!');
      } else {
        alert('Failed to send test notification');
      }
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
      setError(error.response?.data?.error || 'Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const getThresholdStatusIcon = (status: 'normal' | 'high_daily' | 'high_monthly' | 'unusual_spending' | 'high_single') => {
    switch (status) {
      case 'high_single':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'high_monthly':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'high_daily':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unusual_spending':
        return <AlertTriangle className="h-5 w-5 text-purple-500" />;
      case 'normal':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getThresholdStatusColor = (status: 'normal' | 'high_daily' | 'high_monthly' | 'unusual_spending' | 'high_single') => {
    switch (status) {
      case 'high_single':
        return 'destructive';
      case 'high_monthly':
        return 'secondary';
      case 'high_daily':
        return 'secondary';
      case 'unusual_spending':
        return 'secondary';
      case 'normal':
        return 'default';
    }
  };

  const getThresholdStatusText = (status: 'normal' | 'high_daily' | 'high_monthly' | 'unusual_spending' | 'high_single') => {
    switch (status) {
      case 'high_single':
        return 'High Single Expense (≥Rs. 10,000)';
      case 'high_monthly':
        return 'High Monthly (≥Rs. 100,000)';
      case 'high_daily':
        return 'High Daily (≥Rs. 5,000)';
      case 'unusual_spending':
        return 'Unusual Spending (≥3x average)';
      case 'normal':
        return 'Normal';
    }
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable' | 'no_data') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
      case 'no_data':
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendText = (trend: 'increasing' | 'decreasing' | 'stable' | 'no_data') => {
    switch (trend) {
      case 'increasing':
        return 'Increasing';
      case 'decreasing':
        return 'Decreasing';
      case 'stable':
        return 'Stable';
      case 'no_data':
        return 'No Data';
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expense Pattern Notifications Test</h1>
        <NotificationBell />
      </div>

      {/* Farm Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Select Farm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Choose a farm to test:</label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md"
                disabled={isLoading}
              >
                <option value="">Select a farm...</option>
                {allFarms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name} - {farm.location} (Capacity: {farm.capacity})
                  </option>
                ))}
              </select>
            </div>

            {selectedFarmId && (
              <div className="flex gap-2">
                <Button 
                  onClick={checkExpensePatterns}
                  disabled={isLoading}
                >
                  Check Expense Patterns
                </Button>
                <Button 
                  variant="outline"
                  onClick={testExpenseNotification}
                  disabled={isLoading}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Test Notification
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Farm Expense Statistics Card */}
      {farmStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getThresholdStatusIcon(farmStats.thresholdStatus)}
              Expense Statistics - {farmStats.farmName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Total Expenses</label>
                <div className="text-lg font-semibold">{formatCurrency(farmStats.totalExpenses)}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Today's Expenses</label>
                <div className="text-lg font-semibold">{formatCurrency(farmStats.dailyExpenses)}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Monthly Expenses</label>
                <div className="text-lg font-semibold">{formatCurrency(farmStats.monthlyExpenses)}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Average Daily</label>
                <div className="text-lg font-semibold">{formatCurrency(farmStats.averageDailyExpense)}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Average Monthly</label>
                <div className="text-lg font-semibold">{formatCurrency(farmStats.averageMonthlyExpense)}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Expense Trend</label>
                <div className="flex items-center gap-2">
                  {getTrendIcon(farmStats.expenseTrend)}
                  <span className="text-sm">{getTrendText(farmStats.expenseTrend)}</span>
                </div>
              </div>
              
              <div className="col-span-2">
                <label className="text-sm font-medium">Threshold Status</label>
                <div className="mt-1">
                  <Badge variant={getThresholdStatusColor(farmStats.thresholdStatus)}>
                    {getThresholdStatusText(farmStats.thresholdStatus)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Recent Expenses */}
            {farmStats.recentExpenses.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Recent Expenses (Last 7 Days)</h4>
                <div className="space-y-2">
                  {farmStats.recentExpenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{expense.categoryName}</span>
                        {expense.description && (
                          <span className="text-sm text-gray-600 ml-2">- {expense.description}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(expense.amount)}</div>
                        <div className="text-xs text-gray-500">
                          <DateDisplay date={expense.date} format="short" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Check Result Card */}
      {checkResult && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Pattern Check Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Today's Expenses:</span>
                <span className="font-semibold">{formatCurrency(checkResult.stats.dailyExpenses)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Monthly Expenses:</span>
                <span className="font-semibold">{formatCurrency(checkResult.stats.monthlyExpenses)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Average Daily:</span>
                <span className="font-semibold">{formatCurrency(checkResult.stats.averageDailyExpense)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Threshold Exceeded:</span>
                <Badge variant={checkResult.thresholdExceeded === 'none' ? 'default' : 'destructive'}>
                  {checkResult.thresholdExceeded === 'none' ? 'None' : checkResult.thresholdExceeded}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span>Notifications Sent:</span>
                <span className="font-semibold">{checkResult.notificationsSent}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Check Status:</span>
                <Badge variant={checkResult.checked ? 'default' : 'destructive'}>
                  {checkResult.checked ? 'Completed' : 'Failed'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>1. <strong>Select a Farm:</strong> Choose a farm from the dropdown</p>
          <p>2. <strong>View Statistics:</strong> See current expense patterns and trends</p>
          <p>3. <strong>Check Patterns:</strong> Manually trigger expense pattern analysis</p>
          <p>4. <strong>Test Notification:</strong> Send a test expense notification to yourself</p>
          <p>5. <strong>Thresholds:</strong> High single (≥Rs. 10,000), High daily (≥Rs. 5,000), High monthly (≥Rs. 100,000), Unusual (≥3x average)</p>
          <p>6. <strong>Automatic:</strong> Notifications are automatically sent when expenses are recorded</p>
        </CardContent>
      </Card>
    </div>
  );
}
