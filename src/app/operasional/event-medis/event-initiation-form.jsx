"use client";

import { useState } from "react";
import {
  MEDICAL_EVENT_TYPES,
  MEDICAL_RUNNING_CATEGORIES,
} from "@/lib/constants";
import { createMedicalEvent } from "./actions";

const EVENT_TYPE_OPTIONS = [
  { value: MEDICAL_EVENT_TYPES.LARI, label: "Lari" },
  { value: MEDICAL_EVENT_TYPES.SEPEDA, label: "Sepeda" },
  { value: MEDICAL_EVENT_TYPES.DRAG_RACE, label: "Drag Race" },
  { value: MEDICAL_EVENT_TYPES.ROADRACE, label: "Roadrace" },
  { value: MEDICAL_EVENT_TYPES.KONSER, label: "Konser" },
  { value: MEDICAL_EVENT_TYPES.LAINNYA, label: "Event Lainnya" },
];

const RUNNING_CATEGORY_OPTIONS = [
  { value: MEDICAL_RUNNING_CATEGORIES.FIVE_K, label: "5K" },
  { value: MEDICAL_RUNNING_CATEGORIES.TEN_K, label: "10K" },
  { value: MEDICAL_RUNNING_CATEGORIES.HALF_MARATHON, label: "HM" },
  { value: MEDICAL_RUNNING_CATEGORIES.FULL_MARATHON, label: "FM" },
];

export default function EventInitiationForm() {
  const [eventType, setEventType] = useState(MEDICAL_EVENT_TYPES.LARI);

  return (
    <form action={createMedicalEvent} className="mt-4 space-y-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Nama Event
        <input required name="eventName" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Jenis Event
          <select
            name="eventType"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Organizer
          <input name="organizerName" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
      </div>

      {eventType === MEDICAL_EVENT_TYPES.LAINNYA ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Isi Jenis Event
          <input
            required
            name="eventTypeOther"
            placeholder="Misal: Pawai, Festival, Car Free Day"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      ) : null}

      {eventType === MEDICAL_EVENT_TYPES.LARI ? (
        <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <legend className="px-1 text-xs font-semibold text-slate-700">Kategori Lari</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {RUNNING_CATEGORY_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" name="runningCategories" value={option.value} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Mulai
          <input required type="datetime-local" name="startAt" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Selesai
          <input required type="datetime-local" name="endAt" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Lokasi Event
        <textarea required rows={2} name="locationAddress" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Target Peserta
        <input type="number" min="0" name="participantTarget" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </label>

      <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <legend className="px-1 text-xs font-semibold text-slate-700">Kebutuhan Tim & Armada</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Dokter<input type="number" min="0" defaultValue="0" name="requiredDoctors" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Paramedis<input type="number" min="0" defaultValue="0" name="requiredParamedics" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Perawat<input type="number" min="0" defaultValue="0" name="requiredNurses" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Petugas Lain<input type="number" min="0" defaultValue="0" name="requiredOtherOfficers" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Ambulance<input type="number" min="0" defaultValue="0" name="requiredAmbulances" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Motor Mobile<input type="number" min="0" defaultValue="0" name="requiredMotors" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        </div>
      </fieldset>

      <button type="submit" className="w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Simpan Event</button>
    </form>
  );
}