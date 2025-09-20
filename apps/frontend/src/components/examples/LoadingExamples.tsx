"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoading, usePageLoading, useOperationLoading } from "@/providers/LoadingProvider";
import { MinimalLoadingScreen, PageLoadingScreen } from "@/components/ui/loading-screen";

/**
 * Example component demonstrating different loading screen usage patterns
 * This is for reference and can be removed in production
 */
export const LoadingExamples: React.FC = () => {
  const { showLoading, hideLoading } = useLoading();
  const { showPageLoading, hidePageLoading } = usePageLoading();
  const { 
    showOperationLoading, 
    hideOperationLoading, 
    OperationLoadingComponent 
  } = useOperationLoading();

  const [showInlineLoading, setShowInlineLoading] = useState(false);

  const handleGlobalLoading = () => {
    showLoading("Processing your request...");
    setTimeout(() => {
      hideLoading();
    }, 3000);
  };

  const handlePageLoading = () => {
    showPageLoading("Loading page data...");
    setTimeout(() => {
      hidePageLoading();
    }, 2000);
  };

  const handleOperationLoading = () => {
    showOperationLoading("Saving changes...");
    setTimeout(() => {
      hideOperationLoading();
    }, 1500);
  };

  const handleInlineLoading = () => {
    setShowInlineLoading(true);
    setTimeout(() => {
      setShowInlineLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Loading Screen Examples</CardTitle>
          <CardDescription>
            Different loading screen patterns for various use cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={handleGlobalLoading} className="w-full">
              Global Loading (3s)
            </Button>
            <Button onClick={handlePageLoading} className="w-full">
              Page Loading (2s)
            </Button>
            <Button onClick={handleOperationLoading} className="w-full">
              Operation Loading (1.5s)
            </Button>
            <Button onClick={handleInlineLoading} className="w-full">
              Inline Loading (2s)
            </Button>
          </div>

          {/* Inline loading example */}
          {showInlineLoading && (
            <div className="mt-4 p-4 border rounded-lg">
              <MinimalLoadingScreen message="Processing inline operation..." size="sm" />
            </div>
          )}

          {/* Operation loading component */}
          <OperationLoadingComponent />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
          <CardDescription>
            Code examples for implementing loading screens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Global Loading (Full Screen)</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`import { useLoading } from "@/providers/LoadingProvider";

const { showLoading, hideLoading } = useLoading();

// Show loading
showLoading("Processing your request...");

// Hide loading
hideLoading();`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Page Loading</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`import { usePageLoading } from "@/providers/LoadingProvider";

const { showPageLoading, hidePageLoading } = usePageLoading();

// Show page loading
showPageLoading("Loading page data...");

// Hide page loading
hidePageLoading();`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Operation Loading (Smaller)</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`import { useOperationLoading } from "@/providers/LoadingProvider";

const { 
  showOperationLoading, 
  hideOperationLoading, 
  OperationLoadingComponent 
} = useOperationLoading();

// In your component
return (
  <div>
    <button onClick={() => showOperationLoading("Saving...")}>
      Save
    </button>
    <OperationLoadingComponent />
  </div>
);`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Direct Component Usage</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`import { MinimalLoadingScreen, PageLoadingScreen } from "@/components/ui/loading-screen";

// Minimal loading
<MinimalLoadingScreen message="Loading..." size="sm" />

// Page loading
<PageLoadingScreen message="Loading page..." title="My App" />`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
