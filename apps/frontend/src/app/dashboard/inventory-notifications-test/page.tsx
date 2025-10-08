"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AlertTriangle, CheckCircle, XCircle, TestTube, Package, AlertCircle } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/store/store";

interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  itemType: string;
  categoryName: string;
  stockLevel: 'low' | 'critical' | 'out_of_stock';
  daysUntilEmpty?: number;
}

interface InventoryStats {
  userId: string;
  totalItems: number;
  lowStockItems: number;
  criticalStockItems: number;
  outOfStockItems: number;
  itemsByType: {
    [key: string]: {
      total: number;
      lowStock: number;
      criticalStock: number;
      outOfStock: number;
    };
  };
  lowStockItemsList: InventoryItem[];
}

interface InventoryCheckResult {
  checked: boolean;
  notificationsSent: number;
  stats: InventoryStats;
  thresholdExceeded: 'none' | 'low_stock' | 'critical_stock' | 'out_of_stock';
}

export default function InventoryNotificationsTestPage() {
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [checkResult, setCheckResult] = useState<InventoryCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load inventory stats when component mounts
  useEffect(() => {
    if (user?.id) {
      loadInventoryStats(user.id);
    }
  }, [user?.id]);

  const loadInventoryStats = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`/inventory-notifications/user/${userId}/stats`);
      setInventoryStats(response.data.data);
    } catch (error: any) {
      console.error('Failed to load inventory stats:', error);
      setError(error.response?.data?.error || 'Failed to load inventory statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const checkInventoryLevels = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`/inventory-notifications/user/${user.id}/check`);
      setCheckResult(response.data.data);
      
      // Reload stats after check
      await loadInventoryStats(user.id);
    } catch (error: any) {
      console.error('Failed to check inventory levels:', error);
      setError(error.response?.data?.error || 'Failed to check inventory levels');
    } finally {
      setIsLoading(false);
    }
  };

  const testInventoryNotification = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axiosInstance.post(`/inventory-notifications/user/${user.id}/test`);
      
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

  const getStockLevelIcon = (level: 'low' | 'critical' | 'out_of_stock') => {
    switch (level) {
      case 'out_of_stock':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'low':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStockLevelColor = (level: 'low' | 'critical' | 'out_of_stock') => {
    switch (level) {
      case 'out_of_stock':
        return 'destructive';
      case 'critical':
        return 'secondary';
      case 'low':
        return 'secondary';
    }
  };

  const getStockLevelText = (level: 'low' | 'critical' | 'out_of_stock') => {
    switch (level) {
      case 'out_of_stock':
        return 'Out of Stock';
      case 'critical':
        return 'Critical (≤10% of min)';
      case 'low':
        return 'Low (≤20% of min)';
    }
  };

  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'FEED':
        return '🌾';
      case 'CHICKS':
        return '🐣';
      case 'MEDICINE':
        return '💊';
      case 'EQUIPMENT':
        return '🔧';
      case 'OTHER':
        return '📦';
      default:
        return '📦';
    }
  };

  const getOverallStatusIcon = () => {
    if (!inventoryStats) return <CheckCircle className="h-5 w-5 text-gray-400" />;
    
    if (inventoryStats.outOfStockItems > 0) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else if (inventoryStats.criticalStockItems > 0) {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    } else if (inventoryStats.lowStockItems > 0) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getOverallStatusText = () => {
    if (!inventoryStats) return 'Loading...';
    
    if (inventoryStats.outOfStockItems > 0) {
      return 'Out of Stock Alert';
    } else if (inventoryStats.criticalStockItems > 0) {
      return 'Critical Stock Alert';
    } else if (inventoryStats.lowStockItems > 0) {
      return 'Low Stock Warning';
    } else {
      return 'All Stock Levels Normal';
    }
  };

  const getOverallStatusColor = () => {
    if (!inventoryStats) return 'default';
    
    if (inventoryStats.outOfStockItems > 0) {
      return 'destructive';
    } else if (inventoryStats.criticalStockItems > 0) {
      return 'secondary';
    } else if (inventoryStats.lowStockItems > 0) {
      return 'secondary';
    } else {
      return 'default';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory Level Notifications Test</h1>
        <NotificationBell />
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={checkInventoryLevels}
              disabled={isLoading || !user?.id}
            >
              Check Inventory Levels
            </Button>
            <Button 
              variant="outline"
              onClick={testInventoryNotification}
              disabled={isLoading || !user?.id}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Send Test Notification
            </Button>
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

      {/* Overall Inventory Status Card */}
      {inventoryStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getOverallStatusIcon()}
              Overall Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Total Items</label>
                <div className="text-lg font-semibold">{inventoryStats.totalItems}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Low Stock Items</label>
                <div className="text-lg font-semibold text-yellow-600">{inventoryStats.lowStockItems}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Critical Stock Items</label>
                <div className="text-lg font-semibold text-orange-600">{inventoryStats.criticalStockItems}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Out of Stock Items</label>
                <div className="text-lg font-semibold text-red-600">{inventoryStats.outOfStockItems}</div>
              </div>
              
              <div className="col-span-2">
                <label className="text-sm font-medium">Overall Status</label>
                <div className="mt-1">
                  <Badge variant={getOverallStatusColor()}>
                    {getOverallStatusText()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Items by Type */}
            {Object.keys(inventoryStats.itemsByType).length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Items by Type</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(inventoryStats.itemsByType).map(([type, stats]) => (
                    <div key={type} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getItemTypeIcon(type)}</span>
                        <span className="font-medium">{type}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>Total: {stats.total}</div>
                        <div className="text-yellow-600">Low: {stats.lowStock}</div>
                        <div className="text-orange-600">Critical: {stats.criticalStock}</div>
                        <div className="text-red-600">Out: {stats.outOfStock}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Low Stock Items List */}
      {inventoryStats && inventoryStats.lowStockItemsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inventoryStats.lowStockItemsList.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getItemTypeIcon(item.itemType)}</span>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.categoryName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {getStockLevelIcon(item.stockLevel)}
                      <Badge variant={getStockLevelColor(item.stockLevel)}>
                        {getStockLevelText(item.stockLevel)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {item.currentStock} {item.unit} / {item.minStock} {item.unit} min
                    </div>
                    {item.daysUntilEmpty && (
                      <div className="text-xs text-orange-600">
                        ~{item.daysUntilEmpty} days until empty
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check Result Card */}
      {checkResult && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Level Check Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-semibold">{checkResult.stats.totalItems}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Low Stock Items:</span>
                <span className="font-semibold text-yellow-600">{checkResult.stats.lowStockItems}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Critical Stock Items:</span>
                <span className="font-semibold text-orange-600">{checkResult.stats.criticalStockItems}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Out of Stock Items:</span>
                <span className="font-semibold text-red-600">{checkResult.stats.outOfStockItems}</span>
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
          <p>1. <strong>View Statistics:</strong> See current inventory levels and stock status</p>
          <p>2. <strong>Check Levels:</strong> Manually trigger inventory level analysis</p>
          <p>3. <strong>Test Notification:</strong> Send a test inventory notification to yourself</p>
          <p>4. <strong>Thresholds:</strong> Low (≤20% of min), Critical (≤10% of min), Out of Stock (0)</p>
          <p>5. <strong>Automatic:</strong> Notifications are automatically sent when inventory levels change</p>
          <p>6. <strong>Item Types:</strong> FEED, CHICKS, MEDICINE, EQUIPMENT, OTHER</p>
        </CardContent>
      </Card>
    </div>
  );
}
