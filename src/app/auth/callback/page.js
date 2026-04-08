"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { USER_STATUS } from "@/lib/constants";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    async function handleAuthCallback() {
      if (!isLoaded) return;

      if (!isSignedIn) {
        router.push("/sign-in");
        return;
      }

      try {
        // Get the current session profile to check user status
        // We need to make a server-side request to get the user status
        const response = await fetch("/api/auth/status");
        const data = await response.json();
        
        console.log("Status response:", data);
        
        if (!data.success) {
          router.push("/sign-in");
          return;
        }

        // Check user status and redirect accordingly
        if (data.status === USER_STATUS.PENDING) {
          router.push("/menunggu");
        } else if (data.status === USER_STATUS.REJECTED) {
          router.push("/menunggu");
        } else if (data.status === USER_STATUS.ACTIVE) {
          router.push("/dashboard");
        } else {
          // Default to dashboard for any other status
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error checking user status:", error);
        router.push("/sign-in");
      }
    }

    handleAuthCallback();
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 via-white to-red-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-slate-400">Mengarahkan ke dashboard...</p>
      </div>
    </div>
  );
}
