import { z } from "zod";

export const createLogisticItemSchema = z.object({
  itemCode: z.string().trim().min(2, "Kode item minimal 2 karakter").max(40, "Kode item maksimal 40 karakter"),
  name: z.string().trim().min(2, "Nama item minimal 2 karakter").max(150, "Nama item maksimal 150 karakter"),
  category: z.string().trim().min(2, "Kategori minimal 2 karakter").max(100, "Kategori maksimal 100 karakter"),
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(30, "Satuan maksimal 30 karakter"),
  currentStock: z.number().int().min(0).max(100000),
  minimumStock: z.number().int().min(0).max(100000),
  storageLocation: z.string().trim().max(120, "Lokasi maksimal 120 karakter").optional(),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
});
