"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { USER_STATUS } from "@/lib/constants";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [error, setError] = useState(null);

  useEffect(() => {
    async function handleAuthCallback() {
      if (!isLoaded) return;

      if (!isSignedIn) {
        router.push("/sign-in");
        return;
      }

      try {
        // Get the current session profile to check user status
        const response = await fetch("/api/auth/status");
        const data = await response.json();

        if (!data.success) {
          // status 401: DB unavailable or user has no DB record yet
          // Show error UI — do NOT route anywhere (routing causes a loop
          // because server pages redirect back to /sign-in which comes back here)
          setError("Tidak dapat terhubung ke sistem. Pastikan koneksi internet Anda stabil lalu coba lagi, atau hubungi administrator.");
          return;
        }

        // Check user status and redirect accordingly
        if (data.status === USER_STATUS.ACTIVE) {
          router.push("/dashboard");
        } else if (data.status === USER_STATUS.PENDING || data.status === USER_STATUS.REJECTED) {
          router.push("/menunggu");
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Error checking user status:", err);
        setError("Tidak dapat terhubung ke sistem. Pastikan koneksi internet Anda stabil dan coba lagi.");
      }
    }

    handleAuthCallback();
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 via-white to-red-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="text-center">
        {error ? (
          <div className="mx-auto max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900 dark:bg-slate-800">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Gagal terhubung ke sistem</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p>
            <button
              onClick={() => { setError(null); window.location.reload(); }}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">Mengarahkan ke dashboard...</p>
          </>
        )}
      </div>
    </div>
  );
}
