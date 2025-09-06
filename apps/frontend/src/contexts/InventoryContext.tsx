"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface InventoryItem {
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
  // Purchase tracking
  purchaseHistory?: {
    id: string;
    source: 'dealer' | 'medical_supplier' | 'manual';
    sourceId: string; // dealer/supplier name
    purchaseDate: string;
    quantity: number;
    rate: number;
    totalAmount: number;
    paymentStatus: 'paid' | 'partial' | 'due';
  }[];
}

interface InventoryContextType {
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'purchaseHistory'>, purchaseHistory?: InventoryItem['purchaseHistory']) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  removeInventoryItem: (id: string) => void;
  getInventoryByCategory: (category: 'feed' | 'medicine' | 'other') => InventoryItem[];
  getInventoryStats: () => {
    totalItems: number;
    lowStockItems: number;
    totalValue: number;
    categories: number;
  };
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

interface InventoryProviderProps {
  children: ReactNode;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Load inventory from localStorage on mount
  useEffect(() => {
    const savedInventory = localStorage.getItem('unified-inventory');
    if (savedInventory) {
      setInventory(JSON.parse(savedInventory));
    } else {
      // Mock data for initial setup
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
          batchNumber: 'BF-2024-001',
          purchaseHistory: [{
            id: 'p1',
            source: 'manual',
            sourceId: 'Initial Setup',
            purchaseDate: '2024-01-01',
            quantity: 500,
            rate: 45,
            totalAmount: 22500,
            paymentStatus: 'paid'
          }]
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
          batchNumber: 'VD3-2024-001',
          purchaseHistory: [{
            id: 'p2',
            source: 'manual',
            sourceId: 'Initial Setup',
            purchaseDate: '2024-01-01',
            quantity: 10,
            rate: 250,
            totalAmount: 2500,
            paymentStatus: 'paid'
          }]
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
          description: 'Plastic water troughs for chicks',
          purchaseHistory: [{
            id: 'p3',
            source: 'manual',
            sourceId: 'Initial Setup',
            purchaseDate: '2024-01-01',
            quantity: 20,
            rate: 150,
            totalAmount: 3000,
            paymentStatus: 'paid'
          }]
        }
      ];
      setInventory(mockInventory);
      localStorage.setItem('unified-inventory', JSON.stringify(mockInventory));
    }
  }, []);

  // Save inventory to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('unified-inventory', JSON.stringify(inventory));
  }, [inventory]);

  const addInventoryItem = (itemData: Omit<InventoryItem, 'id' | 'purchaseHistory'>, purchaseHistory?: InventoryItem['purchaseHistory']) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: Date.now().toString(),
      purchaseHistory: purchaseHistory || []
    };
    setInventory(prev => [...prev, newItem]);
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const removeInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  const getInventoryByCategory = (category: 'feed' | 'medicine' | 'other') => {
    return inventory.filter(item => item.category === category);
  };

  const getInventoryStats = () => {
    const totalItems = inventory.length;
    const lowStockItems = inventory.filter(item => item.quantity < 50).length;
    const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    const categories = [...new Set(inventory.map(item => item.category))].length;

    return {
      totalItems,
      lowStockItems,
      totalValue,
      categories
    };
  };

  const value: InventoryContextType = {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    getInventoryByCategory,
    getInventoryStats
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
