import { z } from "zod";
import { phoneNumberSchema } from "@/lib/validations/common";

const optionalTrimmedString = z
  .string()
  .trim()
  .max(255, "Input terlalu panjang")
  .optional()
  .or(z.literal(""));

export const createIncidentSchema = z.object({
  sourceReport: z
    .string()
    .trim()
    .min(2, "Sumber laporan minimal 2 karakter")
    .max(100, "Sumber laporan maksimal 100 karakter"),
  reporterName: optionalTrimmedString,
  reporterPhone: phoneNumberSchema.optional().or(z.literal("")),
  incidentType: z
    .string()
    .trim()
    .min(2, "Jenis kejadian minimal 2 karakter")
    .max(100, "Jenis kejadian maksimal 100 karakter"),
  locationAddress: z
    .string()
    .trim()
    .min(5, "Alamat lokasi minimal 5 karakter")
    .max(255, "Alamat lokasi maksimal 255 karakter"),
  district: z
    .string()
    .trim()
    .min(2, "Kecamatan minimal 2 karakter")
    .max(100, "Kecamatan maksimal 100 karakter"),
  kelurahan: z
    .string()
    .trim()
    .max(100, "Kelurahan maksimal 100 karakter")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(1200, "Deskripsi maksimal 1200 karakter").optional(),
  initialVictims: z.number().int().min(0).max(999),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

export function parseNumberInput(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const normalized = text.replace(",", ".");
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return null;

  return parsed;
}

export function parseIntegerInput(value, fallback = 0) {
  const text = String(value || "").trim();
  if (!text) return fallback;

  const parsed = Number.parseInt(text, 10);
  if (Number.isNaN(parsed)) return fallback;

  return parsed;
}
