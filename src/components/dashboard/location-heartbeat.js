"use client";

import { useEffect, useRef, useState } from "react";

const SEND_INTERVAL_MS = 30000;

export default function LocationHeartbeat() {
  const [statusText, setStatusText] = useState("Lokasi belum dikirim.");
  const [enabled, setEnabled] = useState(false);
  const lastSentRef = useRef(0);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatusText("Browser tidak mendukung geolokasi.");
      return;
    }

    const sendHeartbeat = async (latitude, longitude) => {
      const now = Date.now();
      if (now - lastSentRef.current < SEND_INTERVAL_MS) return;
      lastSentRef.current = now;

      try {
        const response = await fetch("/api/tracking/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ latitude, longitude }),
        });

        if (!response.ok) {
          setStatusText("Lokasi gagal diperbarui.");
          return;
        }

        setStatusText(
          `Lokasi terkirim ${new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`
        );
      } catch {
        setStatusText("Lokasi gagal diperbarui.");
      }
    };

    const onSuccess = (position) => {
      const { latitude, longitude } = position.coords;
      setEnabled(true);
      sendHeartbeat(latitude, longitude);
    };

    const onError = () => {
      setEnabled(false);
      setStatusText("Izin lokasi belum diberikan.");
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 20000,
      timeout: 12000,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <p className="font-semibold text-slate-700">Tracking Lokasi Petugas</p>
      <p className="mt-0.5">{statusText}</p>
      <p className="mt-0.5 text-slate-500">Status: {enabled ? "Aktif" : "Nonaktif"}</p>
    </div>
  );
}
