"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AlertTriangle, CheckCircle, XCircle, TestTube } from "lucide-react";
import axiosInstance from "@/lib/axios";

interface BatchMortalityStats {
  batchNumber: string;
  initialChicks: number;
  totalMortality: number;
  mortalityRate: number;
  currentBirds: number;
  thresholdStatus: 'safe' | 'warning' | 'critical';
}

interface MortalityCheckResult {
  checked: boolean;
  notificationsSent: number;
  mortalityRate: number;
  thresholdExceeded: 'none' | 'warning' | 'critical';
}

export default function MortalityNotificationsTestPage() {
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batchStats, setBatchStats] = useState<BatchMortalityStats | null>(null);
  const [checkResult, setCheckResult] = useState<MortalityCheckResult | null>(null);
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
      
      const response = await axiosInstance.get(`/mortality-notifications/batch/${batchId}/stats`);
      setBatchStats(response.data.data);
    } catch (error: any) {
      console.error('Failed to load batch stats:', error);
      setError(error.response?.data?.error || 'Failed to load batch statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const checkMortalityThresholds = async () => {
    if (!selectedBatchId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`/mortality-notifications/batch/${selectedBatchId}/check`);
      setCheckResult(response.data.data);
      
      // Reload stats after check
      await loadBatchStats(selectedBatchId);
    } catch (error: any) {
      console.error('Failed to check mortality thresholds:', error);
      setError(error.response?.data?.error || 'Failed to check mortality thresholds');
    } finally {
      setIsLoading(false);
    }
  };

  const testMortalityNotification = async () => {
    if (!selectedBatchId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.post(`/mortality-notifications/batch/${selectedBatchId}/test`);
      
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

  const getThresholdStatusIcon = (status: 'safe' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'safe':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getThresholdStatusColor = (status: 'safe' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'safe':
        return 'default';
    }
  };

  const getThresholdStatusText = (status: 'safe' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'Critical (≥10%)';
      case 'warning':
        return 'Warning (≥5%)';
      case 'safe':
        return 'Safe (<5%)';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mortality Notifications Test</h1>
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
                  onClick={checkMortalityThresholds}
                  disabled={isLoading}
                >
                  Check Mortality Thresholds
                </Button>
                <Button 
                  variant="outline"
                  onClick={testMortalityNotification}
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

      {/* Batch Statistics Card */}
      {batchStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getThresholdStatusIcon(batchStats.thresholdStatus)}
              Batch Statistics - {batchStats.batchNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Initial Chicks</label>
                <div className="text-lg font-semibold">{batchStats.initialChicks}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Current Birds</label>
                <div className="text-lg font-semibold">{batchStats.currentBirds}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Total Mortality</label>
                <div className="text-lg font-semibold">{batchStats.totalMortality}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Mortality Rate</label>
                <div className="text-lg font-semibold">{batchStats.mortalityRate.toFixed(2)}%</div>
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
            <CardTitle>Mortality Check Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Mortality Rate:</span>
                <span className="font-semibold">{checkResult.mortalityRate.toFixed(2)}%</span>
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
          <p>2. <strong>View Statistics:</strong> See current mortality rate and threshold status</p>
          <p>3. <strong>Check Thresholds:</strong> Manually trigger mortality threshold check</p>
          <p>4. <strong>Test Notification:</strong> Send a test mortality notification to yourself</p>
          <p>5. <strong>Thresholds:</strong> Warning at 5%, Critical at 10% mortality rate</p>
          <p>6. <strong>Automatic:</strong> Notifications are automatically sent when mortality records are created</p>
        </CardContent>
      </Card>
    </div>
  );
}
