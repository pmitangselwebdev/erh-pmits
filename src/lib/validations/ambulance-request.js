import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .max(255, "Input terlalu panjang")
  .optional()
  .or(z.literal(""));

export const createAmbulanceRequestSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(2, "Nama pasien minimal 2 karakter")
    .max(120, "Nama pasien maksimal 120 karakter"),
  patientAge: z.number().int().min(0).max(120).nullable(),
  patientGender: optionalTrimmedString,
  patientCondition: z.string().trim().max(600, "Kondisi pasien terlalu panjang").optional(),
  pickupAddress: z
    .string()
    .trim()
    .min(5, "Alamat pickup minimal 5 karakter")
    .max(255, "Alamat pickup maksimal 255 karakter"),
  pickupDistrict: z
    .string()
    .trim()
    .min(2, "Kecamatan minimal 2 karakter")
    .max(100, "Kecamatan maksimal 100 karakter"),
  pickupKelurahan: z
    .string()
    .trim()
    .max(100, "Kelurahan pickup maksimal 100 karakter")
    .optional()
    .or(z.literal("")),
  destinationType: z
    .string()
    .trim()
    .min(2, "Jenis tujuan minimal 2 karakter")
    .max(100, "Jenis tujuan maksimal 100 karakter"),
  destinationName: z
    .string()
    .trim()
    .min(2, "Nama tujuan minimal 2 karakter")
    .max(120, "Nama tujuan maksimal 120 karakter"),
  priority: z
    .string()
    .trim()
    .min(2, "Prioritas minimal 2 karakter")
    .max(30, "Prioritas maksimal 30 karakter"),
  pickupLatitude: z.number().min(-90).max(90).nullable(),
  pickupLongitude: z.number().min(-180).max(180).nullable(),
  incidentId: z.string().trim().cuid().optional().or(z.literal("")),
  unitId: z.string().trim().cuid().optional().or(z.literal("")),
});
