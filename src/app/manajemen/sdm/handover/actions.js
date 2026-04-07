"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import { SHIFT_TYPES, SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createBulkNotifications } from "@/lib/notification";

const ALLOWED_ROLES = new Set([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.KOORDINATOR_POSKO]);

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({ tab: "handover", alert: message, alertType: type });
  redirect(`/manajemen/sdm?${params.toString()}`);
}

function parseMultiValue(formData, key) {
  return formData
    .getAll(key)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function parseDateOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function createHandoverShift(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE || !ALLOWED_ROLES.has(actor.role)) {
    redirectWithAlert("Anda tidak memiliki akses untuk membuat handover shift.");
  }

  const handoverDateValue = String(formData.get("handoverDate") || "").trim();
  const previousShift = String(formData.get("previousShift") || "").trim();
  const nextShift = String(formData.get("nextShift") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const constraints = String(formData.get("constraints") || "").trim();
  const requiredNeeds = String(formData.get("requiredNeeds") || "").trim();

  const previousOfficerIds = parseMultiValue(formData, "previousOfficerIds");
  const nextOfficerIds = parseMultiValue(formData, "nextOfficerIds");
  const activeIncidentIds = parseMultiValue(formData, "activeIncidentIds");

  const handoverDate = parseDateOnly(handoverDateValue);
  if (!handoverDate) {
    redirectWithAlert("Tanggal handover tidak valid.");
  }

  if (!Object.values(SHIFT_TYPES).includes(previousShift)) {
    redirectWithAlert("Shift sebelumnya tidak valid.");
  }
  if (!Object.values(SHIFT_TYPES).includes(nextShift)) {
    redirectWithAlert("Shift berikutnya tidak valid.");
  }
  if (previousShift === nextShift) {
    redirectWithAlert("Shift sebelumnya dan berikutnya harus berbeda.");
  }

  const created = await db.handoverShift.create({
    data: {
      handoverDate,
      previousShift,
      nextShift,
      previousOfficerIds,
      nextOfficerIds,
      activeIncidentIds,
      notes: notes || null,
      constraints: constraints || null,
      requiredNeeds: requiredNeeds || null,
      status: "SUBMITTED",
      createdById: actor.id,
    },
    select: {
      id: true,
      handoverDate: true,
      previousShift: true,
      nextShift: true,
      status: true,
      previousOfficerIds: true,
      nextOfficerIds: true,
      activeIncidentIds: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "handover_shift",
    details: JSON.stringify({
      handoverId: created.id,
      handoverDate: created.handoverDate,
      previousShift: created.previousShift,
      nextShift: created.nextShift,
      status: created.status,
      previousOfficerCount: created.previousOfficerIds.length,
      nextOfficerCount: created.nextOfficerIds.length,
      activeIncidentCount: created.activeIncidentIds.length,
    }),
  });

  await createBulkNotifications({
    userIds: [...previousOfficerIds, ...nextOfficerIds],
    title: "Dokumen Handover Baru",
    message: `Handover shift ${created.previousShift} ke ${created.nextShift} telah dibuat untuk ${new Date(
      created.handoverDate
    ).toLocaleDateString("id-ID")}.`,
    category: "HANDOVER_SHIFT",
  });

  revalidatePath("/manajemen/sdm");
  redirectWithAlert("Handover shift berhasil dibuat.", "success");
}

export async function confirmHandoverShift(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE || !ALLOWED_ROLES.has(actor.role)) {
    redirectWithAlert("Anda tidak memiliki akses untuk konfirmasi handover.");
  }

  const handoverId = String(formData.get("handoverId") || "").trim();
  if (!handoverId) {
    redirectWithAlert("ID handover tidak valid.");
  }

  const updated = await db.handoverShift.update({
    where: { id: handoverId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
    },
    select: {
      id: true,
      handoverDate: true,
      previousShift: true,
      nextShift: true,
      status: true,
      previousOfficerIds: true,
      nextOfficerIds: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "STATUS_CHANGE",
    module: "handover_shift",
    details: JSON.stringify({
      handoverId: updated.id,
      handoverDate: updated.handoverDate,
      previousShift: updated.previousShift,
      nextShift: updated.nextShift,
      status: updated.status,
    }),
  });

  await createBulkNotifications({
    userIds: [...updated.previousOfficerIds, ...updated.nextOfficerIds],
    title: "Handover Shift Dikonfirmasi",
    message: `Handover shift ${updated.previousShift} ke ${updated.nextShift} tanggal ${new Date(
      updated.handoverDate
    ).toLocaleDateString("id-ID")} telah dikonfirmasi.`,
    category: "HANDOVER_SHIFT",
  });

  revalidatePath("/manajemen/sdm");
  redirectWithAlert("Handover shift berhasil dikonfirmasi.", "success");
}
