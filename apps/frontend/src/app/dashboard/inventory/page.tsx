"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Wheat, Pill, Box, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column, createColumn } from "@/components/ui/data-table";
import { useInventory, InventoryItem } from "@/contexts/InventoryContext";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'medicine' | 'other'>('feed');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const { 
    inventory, 
    getInventoryByCategory, 
    getInventoryStats,
    addInventoryItem
  } = useInventory();

  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
    rate: '',
    supplier: '',
    batchNumber: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredInventory = getInventoryByCategory(activeTab);
  const stats = getInventoryStats();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) newErrors.quantity = 'Valid quantity is required';
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required';
    if (!formData.rate || parseFloat(formData.rate) <= 0) newErrors.rate = 'Valid rate is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    addInventoryItem({
      name: formData.name,
      category: 'other',
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      rate: parseFloat(formData.rate),
      totalValue: parseFloat(formData.quantity) * parseFloat(formData.rate),
      supplier: formData.supplier || undefined,
      batchNumber: formData.batchNumber || undefined,
      description: formData.description || undefined
    });

    setIsAddModalOpen(false);
    setFormData({
      name: '',
      quantity: '',
      unit: '',
      rate: '',
      supplier: '',
      batchNumber: '',
      description: ''
    });
    setErrors({});
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'feed': return <Wheat className="h-4 w-4" />;
      case 'medicine': return <Pill className="h-4 w-4" />;
      case 'other': return <Box className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  // Column configurations for different categories
  const getInventoryColumns = (category: 'feed' | 'medicine' | 'other'): Column<InventoryItem>[] => {
    const baseColumns: Column<InventoryItem>[] = [
      createColumn('name', 'Item', {
        render: (_, item) => (
          <div>
            <p className="font-medium">{item.name}</p>
            {item.batchNumber && (
              <p className="text-sm text-gray-600">Batch: {item.batchNumber}</p>
            )}
          </div>
        )
      }),
      createColumn('quantity', 'Quantity', {
        render: (_, item) => (
          <div className="flex items-center space-x-1">
            <span className="font-medium">{item.quantity}</span>
            <span className="text-sm text-gray-600">{item.unit}</span>
          </div>
        )
      }),
      createColumn('rate', 'Rate', {
        type: 'currency',
        align: 'right'
      }),
      createColumn('totalValue', 'Value', {
        type: 'currency',
        align: 'right'
      }),
      createColumn('supplier', 'Supplier', {
        render: (value) => value || '—'
      })
    ];

    // Add expiry date column for medicine
    if (category === 'medicine') {
      baseColumns.splice(4, 0, createColumn('expiryDate', 'Expiry', {
        render: (value) => {
          if (!value) return '—';
          const isExpired = new Date(value) < new Date();
          return (
            <span className={isExpired ? 'text-red-600 font-medium' : ''}>
              {new Date(value).toLocaleDateString()}
            </span>
          );
        }
      }));
    }

    // Add status column
    baseColumns.push(createColumn('status', 'Status', {
      render: (_, item) => (
        <Badge 
          variant={item.quantity < 50 ? "destructive" : "secondary"}
          className={item.quantity < 50 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}
        >
          {item.quantity < 50 ? 'Low Stock' : 'In Stock'}
        </Badge>
      )
    }));

    // No purchase history column needed in inventory - that data belongs in ledgers

    return baseColumns;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            {activeTab === 'other' 
              ? 'Manage other supplies and equipment.' 
              : 'Track feed, medicine, and supplies from purchases.'
            }
          </p>
        </div>
        {activeTab === 'other' ? (
          <Button 
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
            onClick={openAddModal}
          >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
        ) : (
          <div className="text-sm text-muted-foreground">
            Items are automatically added when you make purchases in {activeTab === 'feed' ? 'Dealer Ledger' : 'Medical Supplier Ledger'}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">In stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Need reorder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">₹{stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Inventory worth</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.categories}</div>
            <p className="text-xs text-muted-foreground">Item types</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8 overflow-x-auto">
          {[
            { key: 'feed', label: 'Feed', icon: <Wheat className="h-4 w-4" /> },
            { key: 'medicine', label: 'Medicine', icon: <Pill className="h-4 w-4" /> },
            { key: 'other', label: 'Other', icon: <Box className="h-4 w-4" /> }
          ].map((tab) => (
            <button
              key={tab.key}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <Badge variant="secondary" className="ml-1">
                {inventory.filter(item => item.category === tab.key).length}
              </Badge>
            </button>
          ))}
        </nav>
      </div>

      {/* Inventory Table */}
        <Card>
          <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getCategoryIcon(activeTab)}
            <span>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Inventory</span>
          </CardTitle>
          <CardDescription>
            {filteredInventory.length} items in {activeTab} category
          </CardDescription>
          </CardHeader>
        <CardContent className="p-0">
          {filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No {activeTab} items found</p>
              {activeTab === 'other' ? (
                <Button 
                  className="mt-4 bg-primary hover:bg-primary/90"
                  onClick={openAddModal}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Item
                </Button>
              ) : (
                <p className="text-sm mt-2">
                  Items will appear here when you make purchases in {activeTab === 'feed' ? 'Dealer Ledger' : 'Medical Supplier Ledger'}
                </p>
              )}
            </div>
          ) : (
            <DataTable
              data={filteredInventory}
              columns={getInventoryColumns(activeTab)}
              emptyMessage={`No ${activeTab} items found`}
            />
          )}
          </CardContent>
        </Card>

      {/* Add Item Modal (for Other tab only) */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Add Other Item"
      >
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Add Other Item</h2>
          
          <div className="grid gap-4">
                <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter item name"
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                />
                {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>}
              </div>
                <div>
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="pieces, kg, bottles"
                />
                {errors.unit && <p className="text-sm text-red-600 mt-1">{errors.unit}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="rate">Rate per Unit (₹) *</Label>
              <Input
                id="rate"
                type="number"
                value={formData.rate}
                onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                placeholder="0"
              />
              {errors.rate && <p className="text-sm text-red-600 mt-1">{errors.rate}</p>}
            </div>

            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="Supplier name"
              />
            </div>

            <div>
              <Label htmlFor="batchNumber">Batch Number</Label>
              <Input
                id="batchNumber"
                value={formData.batchNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                placeholder="Batch number"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
              Add Item
            </Button>
          </div>
      </div>
      </Modal>

    </div>
  );
}
