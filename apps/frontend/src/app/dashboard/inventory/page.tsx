"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Plus, AlertTriangle, Wheat, Pill, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InventoryItem {
  id: string;
  name: string;
  category: 'feed' | 'medicine' | 'other';
  quantity: number;
  unit: string;
  rate: number;
  totalValue: number;
  supplier?: string;
  expiryDate?: string;
  batchNumber?: string;
  description?: string;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'medicine' | 'other'>('feed');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'feed' as 'feed' | 'medicine' | 'other',
    quantity: '',
    unit: '',
    rate: '',
    supplier: '',
    expiryDate: '',
    batchNumber: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load inventory from localStorage on mount
  useEffect(() => {
    const savedInventory = localStorage.getItem('inventory');
    if (savedInventory) {
      setInventory(JSON.parse(savedInventory));
    } else {
      // Mock data
      const mockInventory: InventoryItem[] = [
        {
          id: '1',
          name: 'Broiler Starter Feed',
          category: 'feed',
          quantity: 500,
          unit: 'kg',
          rate: 45,
          totalValue: 22500,
          supplier: 'ABC Feed Company',
          batchNumber: 'BF-2024-001'
        },
        {
          id: '2',
          name: 'Vitamin D3',
          category: 'medicine',
          quantity: 10,
          unit: 'bottles',
          rate: 250,
          totalValue: 2500,
          supplier: 'MediCorp',
          expiryDate: '2025-12-31',
          batchNumber: 'VD3-2024-001'
        },
        {
          id: '3',
          name: 'Water Troughs',
          category: 'other',
          quantity: 20,
          unit: 'pieces',
          rate: 150,
          totalValue: 3000,
          supplier: 'Farm Equipment Ltd',
          description: 'Plastic water troughs for chicks'
        }
      ];
      setInventory(mockInventory);
      localStorage.setItem('inventory', JSON.stringify(mockInventory));
    }
  }, []);

  // Save inventory to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory));
  }, [inventory]);

  const filteredInventory = inventory.filter(item => item.category === activeTab);

  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(item => item.quantity < 50).length;
  const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const categories = [...new Set(inventory.map(item => item.category))].length;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) newErrors.quantity = 'Valid quantity is required';
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required';
    if (!formData.rate || parseFloat(formData.rate) <= 0) newErrors.rate = 'Valid rate is required';
    
    if (formData.category === 'medicine' && !formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required for medicine';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: formData.name,
      category: formData.category,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      rate: parseFloat(formData.rate),
      totalValue: parseFloat(formData.quantity) * parseFloat(formData.rate),
      supplier: formData.supplier || undefined,
      expiryDate: formData.expiryDate || undefined,
      batchNumber: formData.batchNumber || undefined,
      description: formData.description || undefined
    };

    setInventory([...inventory, newItem]);
    setIsAddModalOpen(false);
    setFormData({
      name: '',
      category: 'feed',
      quantity: '',
      unit: '',
      rate: '',
      supplier: '',
      expiryDate: '',
      batchNumber: '',
      description: ''
    });
    setErrors({});
  };

  const openAddModal = (category: 'feed' | 'medicine' | 'other') => {
    setFormData(prev => ({ ...prev, category }));
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

  // const getCategoryColor = (category: string) => {
  //   switch (category) {
  //     case 'feed': return 'bg-green-100 text-green-800';
  //     case 'medicine': return 'bg-blue-100 text-blue-800';
  //     case 'other': return 'bg-gray-100 text-gray-800';
  //     default: return 'bg-gray-100 text-gray-800';
  //   }
  // };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Manage feed, medicine, and supplies.</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
          onClick={() => openAddModal(activeTab)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">In stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Need reorder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Inventory worth</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{categories}</div>
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
        <CardContent>
          {filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No {activeTab} items found</p>
              <Button 
                className="mt-4 bg-primary hover:bg-primary/90"
                onClick={() => openAddModal(activeTab)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add First {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Item</th>
                    <th className="text-left py-3 px-2 font-medium">Quantity</th>
                    <th className="text-left py-3 px-2 font-medium">Rate</th>
                    <th className="text-left py-3 px-2 font-medium">Value</th>
                    <th className="text-left py-3 px-2 font-medium">Supplier</th>
                    {activeTab === 'medicine' && (
                      <th className="text-left py-3 px-2 font-medium">Expiry</th>
                    )}
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.batchNumber && (
                            <p className="text-sm text-muted-foreground">Batch: {item.batchNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">{item.quantity}</span>
                          <span className="text-sm text-muted-foreground">{item.unit}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">₹{item.rate}</td>
                      <td className="py-3 px-2 font-medium">₹{item.totalValue.toLocaleString()}</td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {item.supplier || '-'}
                      </td>
                      {activeTab === 'medicine' && (
                        <td className="py-3 px-2 text-sm">
                          {item.expiryDate ? (
                            <span className={new Date(item.expiryDate) < new Date() ? 'text-red-600' : ''}>
                              {new Date(item.expiryDate).toLocaleDateString()}
                            </span>
                          ) : '-'}
                        </td>
                      )}
                      <td className="py-3 px-2">
                        <Badge 
                          variant={item.quantity < 50 ? "destructive" : "secondary"}
                          className={item.quantity < 50 ? "bg-red-100 text-red-800" : ""}
                        >
                          {item.quantity < 50 ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title={`Add ${formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} Item`}
      >
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Add {formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} Item</h2>
          
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
                  placeholder="kg, pieces, bottles"
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

            {formData.category === 'medicine' && (
              <div>
                <Label htmlFor="expiryDate">Expiry Date *</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
                {errors.expiryDate && <p className="text-sm text-red-600 mt-1">{errors.expiryDate}</p>}
              </div>
            )}

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
