"use client";

import { Loader2, Users, TrendingUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  message?: string;
  showProgress?: boolean;
  progress?: number;
  variant?: "default" | "auth" | "app" | "minimal";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = "Poultry360",
  subtitle = "Smart Poultry Management System",
  message = "Loading...",
  showProgress = false,
  progress = 0,
  variant = "default",
  size = "md",
  className,
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return {
          container: "w-12 h-12",
          icon: "text-lg",
          title: "text-lg",
          subtitle: "text-sm",
          message: "text-xs",
        };
      case "lg":
        return {
          container: "w-20 h-20",
          icon: "text-3xl",
          title: "text-3xl",
          subtitle: "text-lg",
          message: "text-base",
        };
      default: // md
        return {
          container: "w-16 h-16",
          icon: "text-2xl",
          title: "text-2xl",
          subtitle: "text-base",
          message: "text-sm",
        };
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "auth":
        return {
          container: "min-h-screen bg-background",
          card: "bg-card border shadow-lg",
          icon: "bg-primary text-primary-foreground",
        };
      case "app":
        return {
          container: "min-h-screen bg-background",
          card: "bg-card border shadow-lg",
          icon: "bg-primary text-primary-foreground",
        };
      case "minimal":
        return {
          container: "h-32",
          card: "bg-transparent border-0 shadow-none",
          icon: "bg-primary text-primary-foreground",
        };
      default:
        return {
          container: "min-h-screen bg-background",
          card: "bg-card border shadow-lg",
          icon: "bg-primary text-primary-foreground",
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const variantClasses = getVariantClasses();

  const renderIcon = () => {
    if (variant === "minimal") {
      return (
        <Loader2 className={cn("animate-spin text-primary", sizeClasses.icon)} />
      );
    }

    return (
      <div className={cn(
        "rounded-full flex items-center justify-center mx-auto mb-4",
        sizeClasses.container,
        variantClasses.icon
      )}>
        <span className={cn("font-bold", sizeClasses.icon)}>
          P360
        </span>
      </div>
    );
  };

  const renderProgressBar = () => {
    if (!showProgress) return null;

    return (
      <div className="w-full max-w-xs mx-auto mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Loading</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  const renderFeatureIcons = () => {
    if (variant === "minimal") return null;

    return (
      <div className="flex justify-center space-x-4 mt-6 opacity-60">
        <div className="flex flex-col items-center space-y-1">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Farms</span>
        </div>
        <div className="flex flex-col items-center space-y-1">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Batches</span>
        </div>
        <div className="flex flex-col items-center space-y-1">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Analytics</span>
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "flex items-center justify-center",
      variantClasses.container,
      className
    )}>
      <div className={cn(
        "text-center p-8 rounded-lg max-w-md w-full",
        variantClasses.card
      )}>
        {renderIcon()}
        
        <h1 className={cn(
          "font-semibold mb-2 text-foreground",
          sizeClasses.title
        )}>
          {title}
        </h1>
        
        {subtitle && (
          <p className={cn(
            "text-muted-foreground mb-4",
            sizeClasses.subtitle
          )}>
            {subtitle}
          </p>
        )}
        
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className={cn(
            "text-muted-foreground",
            sizeClasses.message
          )}>
            {message}
          </p>
        </div>

        {renderProgressBar()}
        {renderFeatureIcons()}
      </div>
    </div>
  );
};

// Specialized loading screens for different contexts
export const AuthLoadingScreen: React.FC<{ message?: string }> = ({ 
  message = "Initializing authentication..." 
}) => (
  <LoadingScreen
    variant="auth"
    message={message}
    title="Poultry360"
    subtitle="Smart Poultry Management System"
  />
);

export const AppLoadingScreen: React.FC<{ 
  message?: string;
  showProgress?: boolean;
  progress?: number;
}> = ({ 
  message = "Loading application...",
  showProgress = false,
  progress = 0
}) => (
  <LoadingScreen
    variant="app"
    message={message}
    title="Poultry360"
    subtitle="Smart Poultry Management System"
    showProgress={showProgress}
    progress={progress}
  />
);

export const MinimalLoadingScreen: React.FC<{ 
  message?: string;
  size?: "sm" | "md" | "lg";
}> = ({ 
  message = "Loading...",
  size = "md"
}) => (
  <LoadingScreen
    variant="minimal"
    message={message}
    size={size}
  />
);

export const PageLoadingScreen: React.FC<{ 
  message?: string;
  title?: string;
}> = ({ 
  message = "Loading page...",
  title = "Poultry360"
}) => (
  <LoadingScreen
    variant="default"
    message={message}
    title={title}
    subtitle="Please wait while we load your data"
  />
);

export default LoadingScreen;
