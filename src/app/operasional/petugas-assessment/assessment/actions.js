"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import { INCIDENT_STATUS, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { parseIntegerInput } from "@/lib/validations/incident";

const VALID_STATUSES = new Set(Object.values(INCIDENT_STATUS));

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({ alert: message, alertType: type });
  redirect(`/operasional/petugas-assessment/assessment?${params.toString()}`);
}

export async function submitFieldAssessment(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif untuk mengirim laporan assessment.");
  }

  const incidentId = String(formData.get("incidentId") || "").trim();
  const initialVictims = parseIntegerInput(formData.get("initialVictims"), 0);
  const description = String(formData.get("description") || "").trim();
  const status = String(formData.get("status") || "").trim();

  if (!incidentId) {
    redirectWithAlert("Pilih kejadian terlebih dahulu.");
  }
  if (!VALID_STATUSES.has(status)) {
    redirectWithAlert("Status kejadian tidak valid.");
  }
  if (initialVictims < 0 || initialVictims > 9999) {
    redirectWithAlert("Jumlah korban tidak valid.");
  }

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: { id: true, incidentCode: true, status: true },
  });
  if (!incident) {
    redirectWithAlert("Kejadian tidak ditemukan.");
  }

  await db.incident.update({
    where: { id: incidentId },
    data: {
      initialVictims,
      description: description || null,
      status,
      assignedOfficerId: actor.id,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "UPDATE",
    module: "incident",
    details: JSON.stringify({
      incidentId,
      incidentCode: incident.incidentCode,
      initialVictims,
      status,
      note: "Field assessment update",
    }),
  });

  revalidatePath("/operasional/petugas-assessment/assessment");
  redirectWithAlert(
    `Assessment kejadian ${incident.incidentCode} berhasil dikirim.`,
    "success"
  );
}
