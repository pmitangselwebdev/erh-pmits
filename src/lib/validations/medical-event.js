import { z } from "zod";
import { MEDICAL_EVENT_TYPES, MEDICAL_RUNNING_CATEGORIES } from "@/lib/constants";

export const createMedicalEventSchema = z
  .object({
    eventName: z.string().trim().min(3, "Nama event minimal 3 karakter").max(160),
    eventType: z.enum(Object.values(MEDICAL_EVENT_TYPES), {
      message: "Jenis event wajib dipilih",
    }),
    eventTypeOther: z.string().trim().max(80).optional(),
    runningCategories: z.array(z.enum(Object.values(MEDICAL_RUNNING_CATEGORIES))).max(4),
    organizerName: z.string().trim().max(120).optional(),
    startAt: z.coerce.date({ message: "Waktu mulai tidak valid" }),
    endAt: z.coerce.date({ message: "Waktu selesai tidak valid" }),
    district: z.string().trim().max(80).optional(),
    locationAddress: z.string().trim().min(5, "Alamat minimal 5 karakter").max(255),
    participantTarget: z.number().int().min(0).max(100000).nullable(),
    requiredDoctors: z.number().int().min(0).max(100),
    requiredParamedics: z.number().int().min(0).max(200),
    requiredNurses: z.number().int().min(0).max(200),
    requiredOtherOfficers: z.number().int().min(0).max(500),
    requiredAmbulances: z.number().int().min(0).max(100),
    requiredMotors: z.number().int().min(0).max(200),
  })
  .refine((v) => v.endAt > v.startAt, {
    path: ["endAt"],
    message: "Waktu selesai harus lebih besar dari waktu mulai",
  })
  .refine((v) => (v.eventType === MEDICAL_EVENT_TYPES.LARI ? v.runningCategories.length > 0 : true), {
    path: ["runningCategories"],
    message: "Kategori lari wajib dipilih minimal satu",
  })
  .refine((v) => (v.eventType === MEDICAL_EVENT_TYPES.LAINNYA ? Boolean(v.eventTypeOther?.trim()) : true), {
    path: ["eventTypeOther"],
    message: "Jenis event lainnya wajib diisi",
  });

export const createMedicalEventPostSchema = z.object({
  eventId: z.string().cuid(),
  postName: z.string().trim().min(2).max(120),
  postType: z.enum(["WATER_STATION", "MEDICAL_TENT", "MOBILE_POINT"]),
  kmPoint: z.string().trim().max(40).optional(),
  locationAddress: z.string().trim().min(5).max(255),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  requiredDoctors: z.number().int().min(0).max(50),
  requiredParamedics: z.number().int().min(0).max(100),
  requiredNurses: z.number().int().min(0).max(100),
  requiredAmbulances: z.number().int().min(0).max(50),
  requiredMotors: z.number().int().min(0).max(100),
  requiredLogisticKinds: z.number().int().min(0).max(500),
});

export function parseInteger(value, fallback = 0) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const parsed = Number.parseInt(text, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function parseNullableInteger(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseNullableNumber(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
