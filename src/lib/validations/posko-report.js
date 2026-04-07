import { z } from "zod";
import { POSKO_REPORT_STATUSES, POSKO_REPORT_TYPES } from "@/lib/constants";

const reportTypeValues = Object.values(POSKO_REPORT_TYPES);
const reportStatusValues = Object.values(POSKO_REPORT_STATUSES);

const optionalLongText = z
  .string()
  .trim()
  .max(4000, "Maksimal 4000 karakter")
  .optional()
  .or(z.literal(""));

const optionalShortText = z
  .string()
  .trim()
  .max(255, "Maksimal 255 karakter")
  .optional()
  .or(z.literal(""));

export function parseMultiValueFormData(formData, key) {
  return Array.from(new Set(formData.getAll(key).map((item) => String(item || "").trim()))).filter(
    Boolean
  );
}

const optionalIntString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const createPoskoReportSchema = z
  .object({
    reportType: z
      .string()
      .trim()
      .refine((value) => reportTypeValues.includes(value), "Jenis laporan tidak valid"),
    title: z
      .string()
      .trim()
      .min(3, "Judul minimal 3 karakter")
      .max(160, "Judul maksimal 160 karakter"),
    reportDate: z.string().trim().min(1, "Tanggal laporan wajib diisi"),
    locationAddress: optionalShortText,
    district: z
      .string()
      .trim()
      .min(2, "Kecamatan minimal 2 karakter")
      .max(100, "Kecamatan maksimal 100 karakter"),
    kelurahan: optionalShortText,
    weatherCondition: optionalShortText,
    operationalSummary: optionalLongText,
    situationOverview: optionalLongText,
    resourceNeeds: optionalLongText,
    recommendation: optionalLongText,
    status: z
      .string()
      .trim()
      .refine((value) => reportStatusValues.includes(value), "Status laporan tidak valid"),
    selectedIncidentIds: z.array(z.string().trim().min(1)).max(100),
    selectedRequestIds: z.array(z.string().trim().min(1)).max(100),
    // ─── Laporan Harian (LapKeg) extras ───────────────────────────────────
    anggaranPersekot: optionalIntString,
    anggaranRealisasi: optionalIntString,
    jumlahPeserta: optionalIntString,
    stokDarahA: optionalIntString,
    stokDarahB: optionalIntString,
    stokDarahAB: optionalIntString,
    stokDarahO: optionalIntString,
    saran: optionalLongText,
    tindakLanjut: optionalLongText,
    // ─── Laporan Situasi extras ────────────────────────────────────────────
    korbanKK: optionalIntString,
    korbanJiwa: optionalIntString,
    lukaBerat: optionalIntString,
    lukaRingan: optionalIntString,
    meninggal: optionalIntString,
    hilang: optionalIntString,
    mengungsi: optionalIntString,
    rusakBerat: optionalIntString,
    rusakSedang: optionalIntString,
    rusakRingan: optionalIntString,
    rumahTerendam: optionalIntString,
    fasSekolah: optionalIntString,
    fasIbadah: optionalIntString,
    fasKesehatan: optionalIntString,
    fasLainnya: optionalIntString,
    totalPersonilPMI: optionalIntString,
    armadaDigunakan: optionalShortText,
    kontakNama: optionalShortText,
    kontakHp: optionalShortText,
  })
  .refine((value) => !Number.isNaN(new Date(value.reportDate).getTime()), {
    path: ["reportDate"],
    message: "Format tanggal laporan tidak valid",
  });

export const generatePoskoReportSchema = z.object({
  reportId: z.string().trim().min(1, "ID laporan tidak valid"),
  format: z.enum(["docx", "pdf"]),
});
