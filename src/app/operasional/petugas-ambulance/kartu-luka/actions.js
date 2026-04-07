"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import { TRIAGE_LEVELS, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createInjuryCardSchema } from "@/lib/validations/injury-card";

const VALID_TRIAGE = new Set(Object.values(TRIAGE_LEVELS));

function mapZodError(error) {
  if (!error?.issues?.length) return "Validasi input gagal.";
  return error.issues[0]?.message || "Validasi input gagal.";
}

function buildCardNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `KL-${datePart}-${randomPart}`;
}

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({ alert: message, alertType: type });
  redirect(`/operasional/petugas-ambulance/permintaan?tab=kartu-luka&${params.toString()}`);
}

export async function createInjuryCard(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif untuk membuat kartu luka.");
  }

  const payload = {
    jenisKejadian: String(formData.get("jenisKejadian") || "").trim(),
    waktuKejadian: String(formData.get("waktuKejadian") || "").trim(),
    lokasi: String(formData.get("lokasi") || "").trim(),
    namaPetugas: String(formData.get("namaPetugas") || "").trim(),
    namaKorban: String(formData.get("namaKorban") || "").trim(),
    usia: String(formData.get("usia") || "").trim(),
    jenisKelamin: String(formData.get("jenisKelamin") || "").trim(),
    alamat: String(formData.get("alamat") || "").trim(),
    nomorTelepon: String(formData.get("nomorTelepon") || "").trim(),
    respon: String(formData.get("respon") || "").trim(),
    nafas: String(formData.get("nafas") || "").trim(),
    frekuensiNafas: String(formData.get("frekuensiNafas") || "").trim(),
    nadi: String(formData.get("nadi") || "").trim(),
    frekuensiNadi: String(formData.get("frekuensiNadi") || "").trim(),
    tekananDarah: String(formData.get("tekananDarah") || "").trim(),
    jenisCedera: String(formData.get("jenisCedera") || "").trim(),
    keluhan: String(formData.get("keluhan") || "").trim(),
    obat: String(formData.get("obat") || "").trim(),
    makanMinum: String(formData.get("makanMinum") || "").trim(),
    penyakit: String(formData.get("penyakit") || "").trim(),
    alergi: String(formData.get("alergi") || "").trim(),
    kejadian: String(formData.get("kejadian") || "").trim(),
    penjelasanTindakan: String(formData.get("penjelasanTindakan") || "").trim(),
    triageLevel: String(formData.get("triageLevel") || "").trim(),
    statusRujukan: String(formData.get("statusRujukan") || "").trim(),
    lokasiRujukan: String(formData.get("lokasiRujukan") || "").trim(),
    ambulanceUsed: String(formData.get("ambulanceUsed") || "") === "on",
    incidentId: String(formData.get("incidentId") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  };

  const parsed = createInjuryCardSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlert(mapZodError(parsed.error));
  }

  const incidentId = parsed.data.incidentId || null;
  if (incidentId) {
    const exists = await db.incident.count({ where: { id: incidentId } });
    if (!exists) {
      redirectWithAlert("Kejadian terkait tidak ditemukan.");
    }
  }

  const ageInt = Number.parseInt(parsed.data.usia, 10);

  let created = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      created = await db.injuryCard.create({
        data: {
          cardNumber: buildCardNumber(),
          // Map to existing columns for backward compat
          victimName: parsed.data.namaKorban,
          gender: parsed.data.jenisKelamin,
          age: Number.isNaN(ageInt) ? null : ageInt,
          address: parsed.data.alamat,
          phoneNumber: parsed.data.nomorTelepon || null,
          injuryType: parsed.data.jenisCedera || null,
          consciousness: parsed.data.respon,
          firstAidAction: parsed.data.penjelasanTindakan || null,
          referralRequired: parsed.data.statusRujukan === "Iya",
          referralHospital: parsed.data.lokasiRujukan || null,
          // New assessment fields
          jenisKejadian: parsed.data.jenisKejadian,
          waktuKejadian: parsed.data.waktuKejadian,
          lokasi: parsed.data.lokasi,
          namaPetugas: parsed.data.namaPetugas,
          respon: parsed.data.respon,
          nafas: parsed.data.nafas,
          frekuensiNafas: parsed.data.frekuensiNafas || null,
          nadi: parsed.data.nadi,
          frekuensiNadi: parsed.data.frekuensiNadi || null,
          tekananDarah: parsed.data.tekananDarah || null,
          keluhan: parsed.data.keluhan || null,
          obat: parsed.data.obat || null,
          makanMinum: parsed.data.makanMinum || null,
          penyakit: parsed.data.penyakit || null,
          alergi: parsed.data.alergi || null,
          kejadian: parsed.data.kejadian || null,
          penjelasanTindakan: parsed.data.penjelasanTindakan || null,
          statusRujukan: parsed.data.statusRujukan,
          lokasiRujukan: parsed.data.lokasiRujukan || null,
          // System fields
          triageLevel: parsed.data.triageLevel,
          ambulanceUsed: parsed.data.ambulanceUsed,
          incidentId,
          officerId: actor.id,
          notes: parsed.data.notes || null,
        },
        select: {
          id: true,
          cardNumber: true,
          victimName: true,
          triageLevel: true,
          incidentId: true,
        },
      });
      break;
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error &&
        typeof error.message === "string" &&
        error.message.includes("Unique constraint failed");

      if (!isUniqueViolation || attempt === 2) {
        redirectWithAlert("Gagal menyimpan kartu luka. Coba lagi.");
      }
    }
  }

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "injury_card",
    details: JSON.stringify({
      cardId: created?.id,
      cardNumber: created?.cardNumber,
      victimName: created?.victimName,
      triageLevel: created?.triageLevel,
      incidentId: created?.incidentId,
    }),
  });

  revalidatePath("/operasional/petugas-ambulance/permintaan");
  redirectWithAlert(`Kartu luka ${created?.cardNumber || "baru"} berhasil dibuat.`, "success");
}

export async function updateInjuryCardTriage(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif untuk mengubah kartu luka.");
  }

  const cardId = String(formData.get("cardId") || "").trim();
  const triageLevel = String(formData.get("triageLevel") || "").trim();
  if (!cardId || !VALID_TRIAGE.has(triageLevel)) {
    redirectWithAlert("Permintaan perubahan triage tidak valid.");
  }

  const updated = await db.injuryCard.update({
    where: { id: cardId },
    data: { triageLevel },
    select: {
      id: true,
      cardNumber: true,
      victimName: true,
      triageLevel: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "STATUS_CHANGE",
    module: "injury_card",
    details: JSON.stringify({
      cardId: updated.id,
      cardNumber: updated.cardNumber,
      victimName: updated.victimName,
      triageLevel: updated.triageLevel,
    }),
  });

  revalidatePath("/operasional/petugas-ambulance/permintaan");
  redirectWithAlert(`Triage ${updated.cardNumber} diubah ke ${updated.triageLevel}.`, "success");
}
