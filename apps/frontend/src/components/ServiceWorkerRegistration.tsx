"use client";

import { useEffect } from "react";
import { useNotificationActions } from "@/common/hooks/useNotificationActions";

export const ServiceWorkerRegistration = () => {
  // Initialize notification actions handler
  useNotificationActions();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerServiceWorker = async () => {
        try {
          const registration =
            await navigator.serviceWorker.register("/service-worker.js");
          console.log("Service Worker registered successfully:", registration);

          // Handle updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New service worker is available
                  console.log("New service worker available");
                  // You can show a notification to the user here
                }
              });
            }
          });

          // Handle service worker messages
          navigator.serviceWorker.addEventListener("message", (event) => {
            console.log("Message from service worker:", event.data);
          });
        } catch (error) {
          console.error("Service Worker registration failed:", error);
        }
      };

      registerServiceWorker();
    }
  }, []);

  return null; // This component doesn't render anything
};
