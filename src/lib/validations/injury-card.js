import { z } from "zod";
import { phoneNumberSchema } from "@/lib/validations/common";

const optionalTrimmedString = z
  .string()
  .trim()
  .max(255, "Input terlalu panjang")
  .optional()
  .or(z.literal(""));

export const createInjuryCardSchema = z.object({
  // Info Kejadian
  jenisKejadian: z.enum(["Rujukan", "Kecelakaan"]),
  waktuKejadian: z.string().min(1, "Waktu kejadian wajib diisi"),
  lokasi: z.string().min(1, "Lokasi wajib diisi"),

  // Info Petugas
  namaPetugas: z.string().min(1, "Nama petugas wajib diisi"),

  // Info Korban
  namaKorban: z.string().min(1, "Nama korban wajib diisi"),
  usia: z.string().min(1, "Usia wajib diisi"),
  jenisKelamin: z.enum(["Laki-laki", "Perempuan"]),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  nomorTelepon: z.string().min(1, "Nomor telepon wajib diisi"),

  // Vital Signs
  respon: z.enum(["Awas", "Suara", "Nyeri", "Tidak Respon"]),
  nafas: z.enum(["Kuat", "Lemah", "Tidak ada"]),
  frekuensiNafas: z.string(),
  nadi: z.enum(["Kuat", "Lemah", "Tidak ada"]),
  frekuensiNadi: z.string(),
  tekananDarah: z.string(),

  // Cedera & Keluhan
  jenisCedera: z.string(),
  keluhan: z.string(),

  // Riwayat (SAMPLE)
  obat: z.string(),
  makanMinum: z.string(),
  penyakit: z.string(),
  alergi: z.string(),
  kejadian: z.string(),

  // Tindakan
  penjelasanTindakan: z.string(),
  triageLevel: z.enum(["HIJAU", "KUNING", "MERAH", "HITAM"]),

  // Rujukan
  statusRujukan: z.enum(["Iya", "Tidak"]),
  lokasiRujukan: z.string().optional(),

  // System fields
  ambulanceUsed: z.boolean(),
  incidentId: z.string().trim().cuid().optional().or(z.literal("")),
  notes: z.string().trim().max(1000, "Catatan maksimal 1000 karakter").optional(),
});
