"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import { OFFICER_TYPES, SHIFT_TYPES, SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notification";

const ALLOWED_ROLES = new Set([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.KOORDINATOR_POSKO]);

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({ tab: "shift", alert: message, alertType: type });
  redirect(`/manajemen/sdm?${params.toString()}`);
}

function normalizeDateOnly(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function createShiftAssignment(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE || !ALLOWED_ROLES.has(actor.role)) {
    redirectWithAlert("Anda tidak memiliki akses untuk mengelola shift.");
  }

  const userId = String(formData.get("userId") || "").trim();
  const dateValue = String(formData.get("date") || "").trim();
  const shiftType = String(formData.get("shiftType") || "").trim();
  const officerType = String(formData.get("officerType") || "").trim();

  if (!userId || !dateValue || !Object.values(SHIFT_TYPES).includes(shiftType)) {
    redirectWithAlert("Data shift tidak valid.");
  }
  if (!Object.values(OFFICER_TYPES).includes(officerType)) {
    redirectWithAlert("Jenis petugas tidak valid.");
  }

  const date = normalizeDateOnly(dateValue);
  if (!date) {
    redirectWithAlert("Tanggal shift tidak valid.");
  }

  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, status: true },
  });
  if (!targetUser || targetUser.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Petugas tidak ditemukan atau belum aktif.");
  }

  const duplicate = await db.shiftAssignment.findFirst({
    where: { userId, date, shiftType },
    select: { id: true },
  });
  if (duplicate) {
    redirectWithAlert("Petugas sudah memiliki shift yang sama pada tanggal tersebut.");
  }

  const created = await db.shiftAssignment.create({
    data: {
      userId,
      date,
      shiftType,
      officerType,
    },
    select: {
      id: true,
      date: true,
      shiftType: true,
      officerType: true,
      user: { select: { fullName: true } },
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "shift_assignment",
    details: JSON.stringify({
      shiftId: created.id,
      date: created.date,
      shiftType: created.shiftType,
      officerType: created.officerType,
      userName: created.user.fullName,
    }),
  });

  await createNotification({
    userId,
    title: "Penugasan Shift Baru",
    message: `Anda dijadwalkan shift ${created.shiftType} pada ${new Date(
      created.date
    ).toLocaleDateString("id-ID")}.`,
    category: "SHIFT_ASSIGNMENT",
  });

  revalidatePath("/manajemen/sdm");
  redirectWithAlert("Shift berhasil ditambahkan.", "success");
}

export async function deleteShiftAssignment(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE || !ALLOWED_ROLES.has(actor.role)) {
    redirectWithAlert("Anda tidak memiliki akses untuk mengelola shift.");
  }

  const shiftId = String(formData.get("shiftId") || "").trim();
  if (!shiftId) {
    redirectWithAlert("ID shift tidak valid.");
  }

  const deleted = await db.shiftAssignment.delete({
    where: { id: shiftId },
    select: {
      id: true,
      date: true,
      shiftType: true,
      officerType: true,
      user: { select: { id: true, fullName: true } },
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "DELETE",
    module: "shift_assignment",
    details: JSON.stringify({
      shiftId: deleted.id,
      date: deleted.date,
      shiftType: deleted.shiftType,
      officerType: deleted.officerType,
      userName: deleted.user.fullName,
    }),
  });

  await createNotification({
    userId: deleted.user.id,
    title: "Perubahan Penugasan Shift",
    message: `Penugasan shift ${deleted.shiftType} pada ${new Date(
      deleted.date
    ).toLocaleDateString("id-ID")} telah dihapus.`,
    category: "SHIFT_ASSIGNMENT",
  });

  revalidatePath("/manajemen/sdm");
  redirectWithAlert("Shift berhasil dihapus.", "success");
}
