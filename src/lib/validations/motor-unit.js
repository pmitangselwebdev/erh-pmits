import { z } from "zod";

export const createMotorUnitSchema = z.object({
  unitCode: z
    .string()
    .trim()
    .min(2, "Kode unit minimal 2 karakter")
    .max(30, "Kode unit maksimal 30 karakter"),
  plateNumber: z
    .string()
    .trim()
    .min(4, "Nomor polisi minimal 4 karakter")
    .max(20, "Nomor polisi maksimal 20 karakter"),
  vehicleName: z
    .string()
    .trim()
    .min(2, "Nama kendaraan minimal 2 karakter")
    .max(120, "Nama kendaraan maksimal 120 karakter"),
  conditionNote: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
});
