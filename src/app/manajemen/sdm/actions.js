"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSessionProfile } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";
import { SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notification";

const APPROVAL_ALLOWED_ROLES = new Set([
  SYSTEM_ROLES.ADMIN,
  SYSTEM_ROLES.KOORDINATOR_POSKO,
]);

export async function updateUserApproval(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || !APPROVAL_ALLOWED_ROLES.has(actor.role)) {
    return;
  }

  const targetUserId = String(formData.get("targetUserId") || "").trim();
  const nextStatus = String(formData.get("nextStatus") || "").trim();

  if (!targetUserId) return;
  if (nextStatus !== USER_STATUS.ACTIVE && nextStatus !== USER_STATUS.REJECTED) {
    return;
  }

  const updated = await db.user.update({
    where: { id: targetUserId },
    data: {
      status: nextStatus,
      isActive: nextStatus === USER_STATUS.ACTIVE,
      joinedAt: nextStatus === USER_STATUS.ACTIVE ? new Date() : null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: nextStatus === USER_STATUS.ACTIVE ? "APPROVE" : "REJECT",
    module: "user",
    details: JSON.stringify({
      targetUserId: updated.id,
      targetName: updated.fullName,
      targetEmail: updated.email,
      status: updated.status,
    }),
  });

  await createNotification({
    userId: updated.id,
    title: "Status Akun Diperbarui",
    message:
      nextStatus === USER_STATUS.ACTIVE
        ? "Akun Anda telah disetujui dan kini aktif."
        : "Akun Anda ditolak. Hubungi Admin/Koordinator untuk detail.",
    category: "USER_APPROVAL",
  });

  revalidatePath("/manajemen/sdm");
}

export async function updateUserProfile(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || !APPROVAL_ALLOWED_ROLES.has(actor.role)) {
    return;
  }

  const targetUserId = String(formData.get("targetUserId") || "").trim();
  if (!targetUserId) return;

  const role = String(formData.get("role") || "").trim();
  const officerType = String(formData.get("officerType") || "").trim();
  const specialization = String(formData.get("specialization") || "").trim();
  const gender = String(formData.get("gender") || "").trim();
  const isActiveValue = String(formData.get("isActive") || "true").trim();
  const isActive = isActiveValue === "true";

  const updated = await db.user.update({
    where: { id: targetUserId },
    data: {
      role: role || undefined,
      officerType: officerType || undefined,
      specialization: specialization || null,
      gender: gender || null,
      isActive,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      officerType: true,
      specialization: true,
      gender: true,
      isActive: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "UPDATE",
    module: "user",
    details: JSON.stringify({
      targetUserId: updated.id,
      targetName: updated.fullName,
      targetEmail: updated.email,
      role: updated.role,
      officerType: updated.officerType,
      specialization: updated.specialization,
      gender: updated.gender,
      isActive: updated.isActive,
    }),
  });

  revalidatePath("/manajemen/sdm");
}

export async function deleteUser(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || !APPROVAL_ALLOWED_ROLES.has(actor.role)) {
    return;
  }

  const targetUserId = String(formData.get("targetUserId") || "").trim();
  if (!targetUserId || targetUserId === actor.id) return;

  const deleted = await db.user.delete({
    where: { id: targetUserId },
    select: { id: true, fullName: true, email: true },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "DELETE",
    module: "user",
    details: JSON.stringify({
      targetUserId: deleted.id,
      targetName: deleted.fullName,
      targetEmail: deleted.email,
    }),
  });

  revalidatePath("/manajemen/sdm");
}
