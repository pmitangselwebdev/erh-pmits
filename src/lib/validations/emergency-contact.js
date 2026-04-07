import { z } from "zod";
import { phoneNumberSchema } from "@/lib/validations/common";

export const createEmergencyContactSchema = z.object({
  name: z.string().trim().min(2, "Nama kontak minimal 2 karakter").max(120, "Nama kontak maksimal 120 karakter"),
  agency: z.string().trim().min(2, "Instansi minimal 2 karakter").max(120, "Instansi maksimal 120 karakter"),
  phoneNumber: phoneNumberSchema,
  backupPhone: phoneNumberSchema.optional().or(z.literal("")),
  district: z.string().trim().max(100, "Kecamatan maksimal 100 karakter").optional(),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
});
