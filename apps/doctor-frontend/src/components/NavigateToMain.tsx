"use client";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { Home, ArrowLeft } from "lucide-react";

interface NavigateToMainProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  showIcon?: boolean;
}

export function NavigateToMain({ 
  className, 
  variant = "outline",
  size = "default",
  showIcon = true
}: NavigateToMainProps) {
  const { user, isAuthenticated, navigateToMainApp } = useAuthStore();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleNavigate = () => {
    try {
      navigateToMainApp();
    } catch (error) {
      console.error("Failed to navigate to main app:", error);
    }
  };

  return (
    <Button
      onClick={handleNavigate}
      variant={variant}
      size={size}
      className={className}
    >
      {showIcon && <Home className="mr-2 h-4 w-4" />}
      Back to Main App
    </Button>
  );
}

// Alternative component for the sidebar or navigation
export function MainAppLink({ className }: { className?: string }) {
  const { user, isAuthenticated, navigateToMainApp } = useAuthStore();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <button
      onClick={navigateToMainApp}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-muted transition-colors ${className}`}
    >
      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
        <Home className="h-4 w-4 text-green-600" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium">Main App</p>
        <p className="text-xs text-muted-foreground">Back to farmer portal</p>
      </div>
    </button>
  );
}

// Simple back button for headers
export function BackToMainButton({ className }: { className?: string }) {
  const { navigateToMainApp } = useAuthStore();

  return (
    <Button
      onClick={navigateToMainApp}
      variant="ghost"
      size="sm"
      className={className}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to Main
    </Button>
  );
}
