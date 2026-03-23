import { z } from "zod";

export const phoneNumberSchema = z
  .string()
  .min(8, "Nomor HP minimal 8 karakter")
  .max(20, "Nomor HP maksimal 20 karakter")
  .regex(/^[0-9+\-()\s]+$/, "Format nomor HP tidak valid");

export const nonEmptyStringSchema = (label) =>
  z
    .string()
    .min(1, `${label} wajib diisi`)
    .max(255, `${label} terlalu panjang`);

export const incidentCodeSchema = z
  .string()
  .min(6, "Incident code minimal 6 karakter")
  .max(30, "Incident code maksimal 30 karakter");
