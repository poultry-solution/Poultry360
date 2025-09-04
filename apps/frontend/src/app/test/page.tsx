// test for user authentication

"use client";

import { useAuth } from "@/store/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Test page for user authentication
export default function TestPage() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      console.log("User is authenticated");
      //   router.push("/dashboard/home");
    }
  }, [isAuthenticated, router]);

  return (
    <div>
      <h1>Test</h1>
      <p>User: {user?.name}</p>
      <p>Is Authenticated: {isAuthenticated ? "Yes" : "No"}</p>
      <p>Is Loading: {isLoading ? "Yes" : "No"}</p>
      <p>Error: {error}</p>
      {/* get all deatils for this user */}
      <p>Details: {JSON.stringify(user)}</p>
    </div>
  );
}
