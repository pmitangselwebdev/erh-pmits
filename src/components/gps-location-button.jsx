"use client";

import { useState } from "react";

export default function GpsLocationButton({
  latitudeId,
  longitudeId,
  className = "",
  buttonClassName = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50",
  label = "Rekam Lokasi GPS",
  loadingLabel = "Mengambil GPS...",
}) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const statusClassName =
    status === "error"
      ? "text-rose-600"
      : status === "success"
        ? "text-emerald-600"
        : "text-slate-500";

  function updateInputValue(input, value) {
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function handleClick() {
    if (!navigator?.geolocation) {
      setStatus("error");
      setMessage("Browser tidak mendukung GPS.");
      return;
    }

    setStatus("loading");
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latInput = document.getElementById(latitudeId);
        const lngInput = document.getElementById(longitudeId);

        if (!latInput || !lngInput) {
          setStatus("error");
          setMessage("Field koordinat tidak ditemukan.");
          return;
        }

        updateInputValue(latInput, String(pos.coords.latitude));
        updateInputValue(lngInput, String(pos.coords.longitude));

        setStatus("success");
        setMessage("Lokasi GPS berhasil ditandai.");
      },
      () => {
        setStatus("error");
        setMessage("Gagal mengambil lokasi GPS.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <button type="button" onClick={handleClick} className={buttonClassName} disabled={status === "loading"}>
        {status === "loading" ? loadingLabel : label}
      </button>
      {message ? <span className={`text-xs ${statusClassName}`}>{message}</span> : null}
    </div>
  );
}
