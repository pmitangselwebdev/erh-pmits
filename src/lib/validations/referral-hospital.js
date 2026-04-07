import { z } from "zod";
import { phoneNumberSchema } from "@/lib/validations/common";

export const createReferralHospitalSchema = z.object({
  name: z.string().trim().min(2, "Nama RS minimal 2 karakter").max(150, "Nama RS maksimal 150 karakter"),
  address: z
    .string()
    .trim()
    .min(5, "Alamat minimal 5 karakter")
    .max(255, "Alamat maksimal 255 karakter"),
  district: z.string().trim().min(2, "Kecamatan minimal 2 karakter").max(100, "Kecamatan maksimal 100 karakter"),
  phoneNumber: phoneNumberSchema.optional().or(z.literal("")),
  emergencyPhone: phoneNumberSchema.optional().or(z.literal("")),
  hasEmergencyUnit: z.boolean(),
  hasTraumaCenter: z.boolean(),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
});
