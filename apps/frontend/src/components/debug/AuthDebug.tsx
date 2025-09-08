"use client";

import { useAuthStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthDebug() {
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    refreshToken,
    testRefreshToken,
    validateToken,
    initialize,
  } = useAuthStore();

  const handleTestRefresh = async () => {
    try {
      console.log("🧪 Testing refresh token...");
      await testRefreshToken();
    } catch (error) {
      console.error("❌ Test failed:", error);
    }
  };

  const handleRefresh = async () => {
    try {
      console.log("🔄 Refreshing token...");
      const newToken = await refreshToken();
      console.log("✅ New token:", newToken);
    } catch (error) {
      console.error("❌ Refresh failed:", error);
    }
  };

  const handleValidate = async () => {
    try {
      console.log("🔍 Validating token...");
      const isValid = await validateToken();
      console.log("✅ Token valid:", isValid);
    } catch (error) {
      console.error("❌ Validation failed:", error);
    }
  };

  const handleInitialize = async () => {
    try {
      console.log("🚀 Initializing auth...");
      await initialize();
      console.log("✅ Auth initialized");
    } catch (error) {
      console.error("❌ Initialization failed:", error);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Auth Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Authenticated:</strong> {isAuthenticated ? "✅ Yes" : "❌ No"}
          </div>
          <div>
            <strong>Loading:</strong> {isLoading ? "⏳ Yes" : "✅ No"}
          </div>
          <div>
            <strong>User ID:</strong> {user?.id || "None"}
          </div>
          <div>
            <strong>User Name:</strong> {user?.name || "None"}
          </div>
          <div>
            <strong>Access Token:</strong> {accessToken ? "✅ Present" : "❌ Missing"}
          </div>
          <div>
            <strong>Error:</strong> {error || "None"}
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={handleTestRefresh} variant="outline" className="w-full">
            🧪 Test Refresh Token
          </Button>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            🔄 Refresh Token
          </Button>
          <Button onClick={handleValidate} variant="outline" className="w-full">
            🔍 Validate Token
          </Button>
          <Button onClick={handleInitialize} variant="outline" className="w-full">
            🚀 Initialize Auth
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Check the browser console for detailed logs.</p>
          <p>Access Token: {accessToken ? `${accessToken.substring(0, 20)}...` : "None"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
