"use client";

import { useState } from "react";
import {
  AVPU_RESPON_OPTIONS,
  MEDICAL_EVENT_CHIEF_COMPLAINT_OPTIONS,
  MEDICAL_EVENT_QUICK_ACTION_OPTIONS,
  TRIAGE_LEVELS,
} from "@/lib/constants";
import { createMedicalEventInjuryCard } from "./actions";

function MultiChoiceCheckbox({ name, label, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 hover:border-rose-300 hover:bg-rose-50 has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50 has-[:checked]:text-rose-700"
          >
            <input type="checkbox" name={name} value={option} className="accent-rose-600" />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

function AvpuRadio() {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-slate-600">Respon (AVPU)</p>
      <div className="flex flex-wrap gap-2">
        {AVPU_RESPON_OPTIONS.map((level) => (
          <label
            key={level}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:font-semibold has-[:checked]:text-blue-700"
          >
            <input type="radio" name="consciousness" value={level} className="accent-blue-600" />
            {level}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function EventInjuryReportForm({ eventId, posts }) {
  const [gpsStatus, setGpsStatus] = useState("GPS belum direkam.");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  function handleCaptureGps() {
    if (!navigator.geolocation) {
      setGpsStatus("Browser tidak mendukung GPS.");
      return;
    }

    setGpsStatus("Mengambil posisi GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = String(position.coords.latitude);
        const nextLongitude = String(position.coords.longitude);
        setLatitude(nextLatitude);
        setLongitude(nextLongitude);
        setGpsStatus("Posisi GPS berhasil direkam.");
      },
      () => {
        setGpsStatus("Gagal mengambil posisi GPS.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      }
    );
  }

  return (
    <form action={createMedicalEventInjuryCard} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />

      <div>
        <h3 className="text-base font-semibold text-slate-900">Form Kartu Luka Event</h3>
        <p className="mt-1 text-xs text-slate-500">Nomor BIB opsional. Form disederhanakan untuk input cepat saat event berlangsung.</p>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Pos Event
        <select name="postId" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Tanpa Pos</option>
          {posts.map((post) => (
            <option key={post.id} value={post.id}>{post.postName}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Nomor BIB<input name="bibNumber" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Nama Korban<input required name="victimName" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Gender<input name="gender" placeholder="L/P" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Usia<input type="number" min="0" max="130" name="age" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Triage
          <select name="triageLevel" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {Object.values(TRIAGE_LEVELS).map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
      </div>

      <AvpuRadio />

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Jenis Cedera<input name="injuryType" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>

      {/* KOMPAK — K-O-M-P-A-K */}
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
        <legend className="px-2 text-xs font-semibold text-slate-700">KOMPAK</legend>

        {/* K – Keluhan Utama */}
        <MultiChoiceCheckbox
          name="chiefComplaints"
          label="K — Keluhan Utama (pilih satu/lebih)"
          options={MEDICAL_EVENT_CHIEF_COMPLAINT_OPTIONS}
        />

        {/* O – Obat */}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">O — Obat yang dikonsumsi<input name="kompakObat" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>

        {/* M – Makan/Minum */}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">M — Makan/Minum terakhir<input name="kompakMakanMinum" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>

        {/* P – Penyakit */}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">P — Penyakit/Riwayat<input name="kompakPenyakit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>

        {/* A – Alergi */}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">A — Alergi<input name="kompakAlergi" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>

        {/* K – Kejadian */}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">K — Kejadian/Kronologis<textarea rows={2} name="kompakKejadian" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
      </fieldset>

      {/* Tindakan Cepat */}
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
        <legend className="px-2 text-xs font-semibold text-slate-700">Tindakan Cepat</legend>
        <MultiChoiceCheckbox
          name="quickActions"
          label="Tindakan yang dilakukan (pilih satu/lebih)"
          options={MEDICAL_EVENT_QUICK_ACTION_OPTIONS}
        />
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Catatan Tindakan Tambahan<textarea rows={2} name="firstAidAction" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
      </fieldset>

      <label className="flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" name="referralRequired" /> Rujukan Diperlukan</label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">RS Rujukan<input name="referralHospital" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Lokasi Korban<input name="locationAddress" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleCaptureGps} className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white">
            Rekam Posisi GPS
          </button>
          <p className="text-xs text-slate-600">{gpsStatus}</p>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input value={latitude} readOnly placeholder="Latitude otomatis" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600" />
          <input value={longitude} readOnly placeholder="Longitude otomatis" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600" />
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Catatan<textarea rows={2} name="notes" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>

      <button type="submit" className="w-full rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white">Simpan Kartu Luka</button>
    </form>
  );
}