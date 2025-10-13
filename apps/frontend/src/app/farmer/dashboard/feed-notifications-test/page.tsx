"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { NotificationBell } from "@/common/components/notifications/NotificationBell";
import { AlertTriangle, CheckCircle, XCircle, TestTube, TrendingUp, TrendingDown, Minus } from "lucide-react";
import axiosInstance from "@/common/lib/axios";

interface FeedConsumptionStats {
  batchNumber: string;
  totalConsumption: number;
  averageDailyConsumption: number;
  currentBirds: number;
  consumptionPerBird: number;
  daysSinceLastConsumption: number;
  lastConsumptionDate: string | null;
  consumptionTrend: 'increasing' | 'decreasing' | 'stable' | 'no_data';
  thresholdStatus: 'normal' | 'low' | 'high' | 'no_consumption';
}

interface FeedCheckResult {
  checked: boolean;
  notificationsSent: number;
  stats: FeedConsumptionStats;
  thresholdExceeded: 'none' | 'low' | 'high' | 'no_consumption';
}

export default function FeedNotificationsTestPage() {
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batchStats, setBatchStats] = useState<FeedConsumptionStats | null>(null);
  const [checkResult, setCheckResult] = useState<FeedCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: batchesResponse } = useGetAllBatches();
  const allBatches = (batchesResponse?.data || []) as any[];

  // Load batch stats when a batch is selected
  useEffect(() => {
    if (selectedBatchId) {
      loadBatchStats(selectedBatchId);
    } else {
      setBatchStats(null);
    }
  }, [selectedBatchId]);

  const loadBatchStats = async (batchId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`/feed-notifications/batch/${batchId}/stats`);
      setBatchStats(response.data.data);
    } catch (error: any) {
      console.error('Failed to load batch feed stats:', error);
      setError(error.response?.data?.error || 'Failed to load batch feed statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const checkFeedConsumption = async () => {
    if (!selectedBatchId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`/feed-notifications/batch/${selectedBatchId}/check`);
      setCheckResult(response.data.data);
      
      // Reload stats after check
      await loadBatchStats(selectedBatchId);
    } catch (error: any) {
      console.error('Failed to check feed consumption:', error);
      setError(error.response?.data?.error || 'Failed to check feed consumption');
    } finally {
      setIsLoading(false);
    }
  };

  const testFeedNotification = async () => {
    if (!selectedBatchId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.post(`/feed-notifications/batch/${selectedBatchId}/test`);
      
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

  const getThresholdStatusIcon = (status: 'normal' | 'low' | 'high' | 'no_consumption') => {
    switch (status) {
      case 'no_consumption':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'low':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'normal':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getThresholdStatusColor = (status: 'normal' | 'low' | 'high' | 'no_consumption') => {
    switch (status) {
      case 'no_consumption':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'low':
        return 'secondary';
      case 'normal':
        return 'default';
    }
  };

  const getThresholdStatusText = (status: 'normal' | 'low' | 'high' | 'no_consumption') => {
    switch (status) {
      case 'no_consumption':
        return 'No Consumption (≥2 days)';
      case 'high':
        return 'High (≥30% above avg)';
      case 'low':
        return 'Low (≥20% below avg)';
      case 'normal':
        return 'Normal';
    }
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable' | 'no_data') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Feed Consumption Notifications Test</h1>
        <NotificationBell />
      </div>

      {/* Batch Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Select Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Choose a batch to test:</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md"
                disabled={isLoading}
              >
                <option value="">Select a batch...</option>
                {allBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchNumber} - {batch.farm?.name} ({batch.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedBatchId && (
              <div className="flex gap-2">
                <Button 
                  onClick={checkFeedConsumption}
                  disabled={isLoading}
                >
                  Check Feed Consumption
                </Button>
                <Button 
                  variant="outline"
                  onClick={testFeedNotification}
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

      {/* Batch Feed Statistics Card */}
      {batchStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getThresholdStatusIcon(batchStats.thresholdStatus)}
              Feed Consumption Statistics - {batchStats.batchNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Total Consumption</label>
                <div className="text-lg font-semibold">{batchStats.totalConsumption.toFixed(1)} kg</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Average Daily</label>
                <div className="text-lg font-semibold">{batchStats.averageDailyConsumption.toFixed(2)} kg/day</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Current Birds</label>
                <div className="text-lg font-semibold">{batchStats.currentBirds}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Per Bird</label>
                <div className="text-lg font-semibold">{batchStats.consumptionPerBird.toFixed(3)} kg/bird</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Days Since Last</label>
                <div className="text-lg font-semibold">{batchStats.daysSinceLastConsumption} days</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Consumption Trend</label>
                <div className="flex items-center gap-2">
                  {getTrendIcon(batchStats.consumptionTrend)}
                  <span className="text-sm">{getTrendText(batchStats.consumptionTrend)}</span>
                </div>
              </div>
              
              <div className="col-span-2">
                <label className="text-sm font-medium">Threshold Status</label>
                <div className="mt-1">
                  <Badge variant={getThresholdStatusColor(batchStats.thresholdStatus)}>
                    {getThresholdStatusText(batchStats.thresholdStatus)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check Result Card */}
      {checkResult && (
        <Card>
          <CardHeader>
            <CardTitle>Feed Consumption Check Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Average Daily Consumption:</span>
                <span className="font-semibold">{checkResult.stats.averageDailyConsumption.toFixed(2)} kg/day</span>
              </div>
              
              <div className="flex justify-between">
                <span>Consumption Per Bird:</span>
                <span className="font-semibold">{checkResult.stats.consumptionPerBird.toFixed(3)} kg/bird</span>
              </div>
              
              <div className="flex justify-between">
                <span>Days Since Last Consumption:</span>
                <span className="font-semibold">{checkResult.stats.daysSinceLastConsumption} days</span>
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
          <p>1. <strong>Select a Batch:</strong> Choose an active batch from the dropdown</p>
          <p>2. <strong>View Statistics:</strong> See current feed consumption patterns and trends</p>
          <p>3. <strong>Check Consumption:</strong> Manually trigger feed consumption analysis</p>
          <p>4. <strong>Test Notification:</strong> Send a test feed consumption notification to yourself</p>
          <p>5. <strong>Thresholds:</strong> No consumption (≥2 days), Low (≥20% below avg), High (≥30% above avg)</p>
          <p>6. <strong>Automatic:</strong> Notifications are automatically sent when feed consumption is recorded</p>
        </CardContent>
      </Card>
    </div>
  );
}
