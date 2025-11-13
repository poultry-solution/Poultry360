"use client";

import { useState, useEffect } from "react";
import { Plus, X, DollarSign, ShoppingCart, Skull, Scale } from "lucide-react";

interface ExpandableQuickActionsProps {
  onAddExpense: () => void;
  onAddSale: () => void;
  onAddMortality: () => void;
  onRecordWeight: () => void;
}

interface ActionButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color: string;
}

export default function ExpandableQuickActions({
  onAddExpense,
  onAddSale,
  onAddMortality,
  onRecordWeight,
}: ExpandableQuickActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Prevent body scroll when expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  const actions: ActionButton[] = [
    {
      icon: DollarSign,
      label: "Add Expense",
      onClick: () => {
        onAddExpense();
        setIsExpanded(false);
      },
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      icon: ShoppingCart,
      label: "Add Sale",
      onClick: () => {
        onAddSale();
        setIsExpanded(false);
      },
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      icon: Skull,
      label: "Add Mortality",
      onClick: () => {
        onAddMortality();
        setIsExpanded(false);
      },
      color: "bg-red-500 hover:bg-red-600",
    },
    {
      icon: Scale,
      label: "Record Weight",
      onClick: () => {
        onRecordWeight();
        setIsExpanded(false);
      },
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ];

  // Calculate positions for a cleaner arc layout
  const getActionPosition = (index: number, total: number) => {
    const radius = 90;
    const arcSpan = 140;
    const startAngle = 180 + (180 - arcSpan) / 2;
    
    const angle = startAngle + (index / (total - 1)) * arcSpan;
    const radian = (angle * Math.PI) / 180;
    
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;
    
    return { x, y };
  };

  return (
    <>


      {/* Center Button with action buttons */}
      <div className="relative z-50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
            isExpanded
              ? "bg-red-500 rotate-45 scale-110"
              : "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          }`}
          aria-label={isExpanded ? "Close quick actions" : "Open quick actions"}
        >
          {isExpanded ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Plus className="h-6 w-6 text-white" />
          )}
        </button>

        {/* Action Buttons - Arc above the center button */}
        {isExpanded && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
            {actions.map((action, index) => {
              const position = getActionPosition(index, actions.length);
              const Icon = action.icon;
              
              return (
                <div
                  key={action.label}
                  className="absolute"
                  style={{
                    left: `${position.x}px`,
                    bottom: `${-position.y}px`,
                    transform: "translate(-50%, 0)",
                    animation: `slideUp 0.3s ease-out ${index * 50}ms both`,
                  }}
                >
                  <div className="pointer-events-auto flex flex-col items-center gap-2 relative">
                    {/* Action button */}
                    <button
                      onClick={action.onClick}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onTouchStart={() => setHoveredIndex(index)}
                      className={`w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${action.color}`}
                      aria-label={action.label}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                    
                    {/* Label - only shows on hover/touch */}
                    {hoveredIndex === index && (
                      <span className="absolute bottom-full mb-2 text-xs font-medium text-white bg-gray-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                        {action.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
      `}</style>
    </>
  );
}