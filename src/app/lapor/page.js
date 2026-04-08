"use client";

import { useState } from "react";

export default function LaporPage() {
  const [tab, setTab] = useState("kejadian");
  const [loadingGps, setLoadingGps] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });

  const [incidentForm, setIncidentForm] = useState({
    reporterName: "",
    reporterPhone: "",
    incidentType: "",
    district: "",
    locationAddress: "",
    initialVictims: "0",
    description: "",
    latitude: "",
    longitude: "",
  });

  const [ambulanceForm, setAmbulanceForm] = useState({
    callerName: "",
    callerPhone: "",
    patientName: "",
    patientAge: "",
    patientGender: "",
    patientCondition: "",
    pickupAddress: "",
    pickupDistrict: "",
    destinationType: "Rumah Sakit",
    destinationName: "",
    priority: "HIGH",
    pickupLatitude: "",
    pickupLongitude: "",
  });

  async function fillCurrentLocation(target) {
    if (!navigator.geolocation) {
      setAlert({ type: "error", message: "Browser tidak mendukung GPS." });
      return;
    }

    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = String(pos.coords.latitude);
        const lng = String(pos.coords.longitude);

        if (target === "kejadian") {
          setIncidentForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        } else {
          setAmbulanceForm((prev) => ({ ...prev, pickupLatitude: lat, pickupLongitude: lng }));
        }

        setAlert({ type: "success", message: "Lokasi GPS berhasil ditandai." });
        setLoadingGps(false);
      },
      () => {
        setAlert({ type: "error", message: "Gagal mengambil lokasi GPS." });
        setLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function submitIncident(e) {
    e.preventDefault();
    setLoadingSubmit(true);
    setAlert({ type: "", message: "" });

    const res = await fetch("/api/public-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "INCIDENT",
        ...incidentForm,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      setAlert({ type: "success", message: data.message });
      setIncidentForm({
        reporterName: "",
        reporterPhone: "",
        incidentType: "",
        district: "",
        locationAddress: "",
        initialVictims: "0",
        description: "",
        latitude: "",
        longitude: "",
      });
    } else {
      setAlert({ type: "error", message: data.message || "Gagal kirim laporan." });
    }

    setLoadingSubmit(false);
  }

  async function submitAmbulance(e) {
    e.preventDefault();
    setLoadingSubmit(true);
    setAlert({ type: "", message: "" });

    const res = await fetch("/api/public-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "AMBULANCE",
        ...ambulanceForm,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      setAlert({ type: "success", message: data.message });
      setAmbulanceForm({
        callerName: "",
        callerPhone: "",
        patientName: "",
        patientAge: "",
        patientGender: "",
        patientCondition: "",
        pickupAddress: "",
        pickupDistrict: "",
        destinationType: "Rumah Sakit",
        destinationName: "",
        priority: "HIGH",
        pickupLatitude: "",
        pickupLongitude: "",
      });
    } else {
      setAlert({ type: "error", message: data.message || "Gagal kirim permintaan." });
    }

    setLoadingSubmit(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 via-white to-red-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Masyarakat</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Lapor Kejadian & Permintaan Ambulance</h1>
          <p className="mt-2 text-sm text-slate-600">
            Isi laporan seakurat mungkin. Setiap laporan akan divalidasi petugas posko sebelum ditindaklanjuti.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTab("kejadian")}
              className={`app-tab-btn ${tab === "kejadian" ? "app-tab-btn-active" : ""}`}
            >
              Lapor Kejadian
            </button>
            <button
              type="button"
              onClick={() => setTab("ambulance")}
              className={`app-tab-btn ${tab === "ambulance" ? "app-tab-btn-active" : ""}`}
            >
              Permintaan Ambulance
            </button>
          </div>
        </section>

        {alert.message ? (
          <section
            className={`rounded-xl border px-4 py-3 text-sm ${
              alert.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {alert.message}
          </section>
        ) : null}

        {tab === "kejadian" ? (
          <form onSubmit={submitIncident} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Form Lapor Kejadian</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                Nama Pelapor
                <input
                  value={incidentForm.reporterName}
                  onChange={(e) => setIncidentForm((p) => ({ ...p, reporterName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Nomor Pelapor
                <input
                  value={incidentForm.reporterPhone}
                  onChange={(e) => setIncidentForm((p) => ({ ...p, reporterPhone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="text-sm text-slate-700 block">
              Jenis Kejadian
              <input
                required
                value={incidentForm.incidentType}
                onChange={(e) => setIncidentForm((p) => ({ ...p, incidentType: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700 block">
              Kecamatan
              <input
                required
                value={incidentForm.district}
                onChange={(e) => setIncidentForm((p) => ({ ...p, district: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700 block">
              Alamat Lokasi
              <textarea
                required
                rows={2}
                value={incidentForm.locationAddress}
                onChange={(e) => setIncidentForm((p) => ({ ...p, locationAddress: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm text-slate-700">
                Jumlah Korban
                <input
                  type="number"
                  min="0"
                  value={incidentForm.initialVictims}
                  onChange={(e) => setIncidentForm((p) => ({ ...p, initialVictims: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Latitude
                <input
                  value={incidentForm.latitude}
                  onChange={(e) => setIncidentForm((p) => ({ ...p, latitude: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Longitude
                <input
                  value={incidentForm.longitude}
                  onChange={(e) => setIncidentForm((p) => ({ ...p, longitude: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => fillCurrentLocation("kejadian")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              disabled={loadingGps}
            >
              {loadingGps ? "Mengambil GPS..." : "Tag Lokasi GPS"}
            </button>

            <label className="text-sm text-slate-700 block">
              Deskripsi
              <textarea
                rows={3}
                value={incidentForm.description}
                onChange={(e) => setIncidentForm((p) => ({ ...p, description: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <button
              disabled={loadingSubmit}
              className="w-full rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-70"
            >
              {loadingSubmit ? "Mengirim..." : "Lapor Kejadian"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitAmbulance} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Form Permintaan Ambulance</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                Nama Pelapor
                <input
                  value={ambulanceForm.callerName}
                  onChange={(e) => setAmbulanceForm((p) => ({ ...p, callerName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Kontak Pelapor
                <input
                  value={ambulanceForm.callerPhone}
                  onChange={(e) => setAmbulanceForm((p) => ({ ...p, callerPhone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                Nama Pasien
                <input
                  required
                  value={ambulanceForm.patientName}
                  onChange={(e) => setAmbulanceForm((p) => ({ ...p, patientName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Usia
                <input
                  type="number"
                  min="0"
                  value={ambulanceForm.patientAge}
                  onChange={(e) => setAmbulanceForm((p) => ({ ...p, patientAge: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="text-sm text-slate-700 block">
              Kondisi Pasien
              <textarea
                rows={2}
                value={ambulanceForm.patientCondition}
                onChange={(e) => setAmbulanceForm((p) => ({ ...p, patientCondition: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700 block">
              Alamat Pickup
              <textarea
                required
                rows={2}
                value={ambulanceForm.pickupAddress}
                onChange={(e) => setAmbulanceForm((p) => ({ ...p, pickupAddress: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm text-slate-700">
                Kecamatan Pickup
                <input
                  required
                  value={ambulanceForm.pickupDistrict}
                  onChange={(e) => setAmbulanceForm((p) => ({ ...p, pickupDistrict: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Latitude
                <input
                  value={ambulanceForm.pickupLatitude}
                  onChange={(e) => setAmbulanceForm((p) => ({ ...p, pickupLatitude: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Longitude
                <input
                  value={ambulanceForm.pickupLongitude}
                  onChange={(e) => setAmbulanceForm((p) => ({ ...p, pickupLongitude: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => fillCurrentLocation("ambulance")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              disabled={loadingGps}
            >
              {loadingGps ? "Mengambil GPS..." : "Tag Lokasi GPS"}
            </button>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                Jenis Tujuan
                <input
                  required
                  value={ambulanceForm.destinationType}
                  onChange={(e) => setAmbulanceForm((p) => ({ ...p, destinationType: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Nama Tujuan
                <input
                  required
                  value={ambulanceForm.destinationName}
                  onChange={(e) => setAmbulanceForm((p) => ({ ...p, destinationName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="text-sm text-slate-700 block">
              Prioritas
              <select
                value={ambulanceForm.priority}
                onChange={(e) => setAmbulanceForm((p) => ({ ...p, priority: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </label>

            <button
              disabled={loadingSubmit}
              className="w-full rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-70"
            >
              {loadingSubmit ? "Mengirim..." : "Permintaan Ambulance"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
