/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateDisplay } from "@/components/ui/date-display";

export interface Column<T = any> {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'badge' | 'actions' | 'currency';
  align?: 'left' | 'center' | 'right';
  width?: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface Action<T = any> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T, index: number) => void;
  variant?: 'default' | 'outline' | 'destructive';
  className?: string;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  footerContent?: React.ReactNode;
  // Selection (optional)
  selectable?: boolean;
  isAllSelected?: boolean;
  onToggleAll?: () => void;
  isRowSelected?: (row: T) => boolean;
  onToggleRow?: (row: T) => void;
  getRowKey?: (row: T, index: number) => string;
}

export function DataTable<T = any>({
  data,
  columns,
  actions = [],
  onSort,
  sortKey,
  sortDirection,
  loading = false,
  emptyMessage = "No data available",
  className,
  showHeader = true,
  showFooter = false,
  footerContent,
  selectable = false,
  isAllSelected,
  onToggleAll,
  isRowSelected,
  onToggleRow,
  getRowKey
}: DataTableProps<T>) {
  const gridTemplate = React.useMemo(() => {
    const base = columns.map((c) => `minmax(${c.width ?? '140px'}, 1fr)`);
    return [selectable ? '48px' : '', ...base].filter(Boolean).join(' ');
  }, [columns, selectable]);
  const handleSort = (key: string) => {
    if (!onSort) return;
    
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;
    
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, newDirection);
  };

  const renderCell = (column: Column<T>, row: T, index: number) => {
    const value = (row as any)[column.key];
    
    if (column.render) {
      return column.render(value, row, index);
    }
    
    switch (column.type) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      
      case 'currency':
        return typeof value === 'number' ? `₹${value.toLocaleString()}` : value;
      
      case 'date':
        if (!value) return '—';
        return <DateDisplay date={value} format="short" />;
      
      case 'badge':
        return (
          <Badge 
            variant="secondary" 
            className="bg-blue-100 text-blue-800 border-blue-200"
          >
            {value}
          </Badge>
        );
      
      case 'actions':
        return (
          <div className="flex items-center justify-end gap-2">
            {actions.map((action, actionIndex) => (
              <Button
                key={actionIndex}
                variant={action.variant || "outline"}
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  action.variant === 'destructive' 
                    ? "hover:bg-red-50 hover:border-red-300" 
                    : "hover:bg-blue-50 hover:border-blue-300",
                  action.className
                )}
                onClick={() => action.onClick(row, index)}
                title={action.label}
              >
                {action.icon || (action.variant === 'destructive' ? <Trash2 className="h-4 w-4" /> : <Pencil className="h-4 w-4" />)}
              </Button>
            ))}
          </div>
        );
      
      default:
        return value || '—';
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded-t-lg"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 border-t"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full border border-gray-200 rounded-lg overflow-hidden bg-white", className)}>
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {showHeader && (
            <div className="bg-gray-50 border-b border-gray-200">
              <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
              {selectable && (
                <div className={cn("px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200 flex items-center justify-center")}> 
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    className="h-4 w-4 cursor-pointer"
                    checked={!!isAllSelected}
                    onChange={onToggleAll}
                  />
                </div>
              )}
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200 last:border-r-0",
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right",
                    column.className
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && onSort && (
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleSort(column.key)}
                          className={cn(
                            "h-3 w-3 flex items-center justify-center hover:bg-gray-200 rounded",
                            sortKey === column.key && sortDirection === 'asc' && "text-primary"
                          )}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleSort(column.key)}
                          className={cn(
                            "h-3 w-3 flex items-center justify-center hover:bg-gray-200 rounded -mt-1",
                            sortKey === column.key && sortDirection === 'desc' && "text-primary"
                          )}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
          
          <div className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                {emptyMessage}
              </div>
            ) : (
              data.map((row, index) => (
                <div
                  key={getRowKey ? getRowKey(row, index) : index}
                  className={cn(
                    "grid hover:bg-gray-50 transition-colors duration-150",
                    index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                  )}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  {selectable && (
                    <div className={cn("px-4 py-3 text-sm border-r border-gray-200 flex items-center justify-center")}>
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        className="h-4 w-4 cursor-pointer"
                        checked={isRowSelected ? !!isRowSelected(row) : false}
                        onChange={() => onToggleRow && onToggleRow(row)}
                      />
                    </div>
                  )}
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-sm border-r border-gray-200 last:border-r-0",
                        column.align === 'center' && "text-center",
                        column.align === 'right' && "text-right",
                        column.className
                      )}
                    >
                      {renderCell(column, row, index)}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {showFooter && footerContent && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 overflow-x-auto">
          <div className="min-w-max">{footerContent}</div>
        </div>
      )}
    </div>
  );
}

// Helper function to create common action configurations
export const createActions = <T = any>(
  onEdit?: (row: T, index: number) => void,
  onDelete?: (row: T, index: number) => void,
  customActions?: Action<T>[]
): Action<T>[] => {
  const actions: Action<T>[] = [];
  
  if (onEdit) {
    actions.push({
      label: 'Edit',
      icon: <Pencil className="h-4 w-4" />,
      onClick: onEdit,
      variant: 'outline'
    });
  }
  
  if (onDelete) {
    actions.push({
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: 'destructive'
    });
  }
  
  if (customActions) {
    actions.push(...customActions);
  }
  
  return actions;
};

// Helper function to create common column configurations
export const createColumn = <T = any>(
  key: string,
  label: string,
  options: Partial<Column<T>> = {}
): Column<T> => ({
  key,
  label,
  type: 'text',
  align: 'left',
  sortable: false,
  ...options
});

// Common column presets
export const commonColumns = {
  actions: <T = any>(actions: Action<T>[]): Column<T> => ({
    key: 'actions',
    label: 'Actions',
    type: 'actions',
    align: 'right',
    width: '120px',
    render: (_, row, index) => (
      <div className="flex items-center justify-end gap-2">
        {actions.map((action, actionIndex) => (
          <Button
            key={actionIndex}
            variant={action.variant || "outline"}
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              action.variant === 'destructive' 
                ? "hover:bg-red-50 hover:border-red-300" 
                : "hover:bg-blue-50 hover:border-blue-300",
              action.className
            )}
            onClick={() => action.onClick(row, index)}
            title={action.label}
          >
            {action.icon || (action.variant === 'destructive' ? <Trash2 className="h-4 w-4" /> : <Pencil className="h-4 w-4" />)}
          </Button>
        ))}
      </div>
    )
  })
};
