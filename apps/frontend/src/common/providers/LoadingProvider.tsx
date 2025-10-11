"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { AppLoadingScreen, MinimalLoadingScreen, PageLoadingScreen } from "@/common/components/ui/loading-screen";

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");

  const showLoading = (message: string = "Loading...") => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  const contextValue: LoadingContextType = {
    isLoading,
    loadingMessage,
    showLoading,
    hideLoading,
    setLoadingMessage,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <AppLoadingScreen message={loadingMessage} />
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};

// Hook for page-level loading
export const usePageLoading = () => {
  const { showLoading, hideLoading, setLoadingMessage } = useLoading();

  const showPageLoading = (message: string = "Loading page...") => {
    showLoading(message);
  };

  const hidePageLoading = () => {
    hideLoading();
  };

  return {
    showPageLoading,
    hidePageLoading,
    setPageLoadingMessage: setLoadingMessage,
  };
};

// Hook for operation-level loading (smaller, inline loading)
export const useOperationLoading = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Processing...");

  const showOperationLoading = (msg: string = "Processing...") => {
    setMessage(msg);
    setIsLoading(true);
  };

  const hideOperationLoading = () => {
    setIsLoading(false);
  };

  const OperationLoadingComponent = () => {
    if (!isLoading) return null;

    return (
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm flex items-center justify-center">
        <MinimalLoadingScreen message={message} size="md" />
      </div>
    );
  };

  return {
    isLoading,
    message,
    showOperationLoading,
    hideOperationLoading,
    setOperationMessage: setMessage,
    OperationLoadingComponent,
  };
};
