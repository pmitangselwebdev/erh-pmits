"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import { SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createEmergencyContactSchema } from "@/lib/validations/emergency-contact";

const ALLOWED_ROLES = new Set([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.KOORDINATOR_POSKO]);

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({ alert: message, alertType: type });
  redirect(`/data-master/kontak-darurat?${params.toString()}`);
}

function mapZodError(error) {
  if (!error?.issues?.length) return "Validasi input gagal.";
  return error.issues[0]?.message || "Validasi input gagal.";
}

export async function createEmergencyContact(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE || !ALLOWED_ROLES.has(actor.role)) {
    redirectWithAlert("Anda tidak memiliki akses untuk mengelola kontak darurat.");
  }

  const payload = {
    name: String(formData.get("name") || "").trim(),
    agency: String(formData.get("agency") || "").trim(),
    phoneNumber: String(formData.get("phoneNumber") || "").trim(),
    backupPhone: String(formData.get("backupPhone") || "").trim(),
    district: String(formData.get("district") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  };

  const parsed = createEmergencyContactSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlert(mapZodError(parsed.error));
  }

  const created = await db.emergencyContact.create({
    data: {
      name: parsed.data.name,
      agency: parsed.data.agency,
      phoneNumber: parsed.data.phoneNumber,
      backupPhone: parsed.data.backupPhone || null,
      district: parsed.data.district || null,
      notes: parsed.data.notes || null,
    },
    select: {
      id: true,
      name: true,
      agency: true,
      phoneNumber: true,
      isActive: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "emergency_contact",
    details: JSON.stringify({
      contactId: created.id,
      name: created.name,
      agency: created.agency,
      phoneNumber: created.phoneNumber,
      isActive: created.isActive,
    }),
  });

  revalidatePath("/data-master/kontak-darurat");
  redirectWithAlert(`Kontak ${created.name} berhasil ditambahkan.`, "success");
}

export async function toggleEmergencyContact(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE || !ALLOWED_ROLES.has(actor.role)) {
    redirectWithAlert("Anda tidak memiliki akses untuk mengelola kontak darurat.");
  }

  const contactId = String(formData.get("contactId") || "").trim();
  const nextActive = String(formData.get("nextActive") || "").trim() === "true";
  if (!contactId) {
    redirectWithAlert("ID kontak tidak valid.");
  }

  const updated = await db.emergencyContact.update({
    where: { id: contactId },
    data: { isActive: nextActive },
    select: {
      id: true,
      name: true,
      agency: true,
      phoneNumber: true,
      isActive: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "STATUS_CHANGE",
    module: "emergency_contact",
    details: JSON.stringify({
      contactId: updated.id,
      name: updated.name,
      agency: updated.agency,
      phoneNumber: updated.phoneNumber,
      isActive: updated.isActive,
    }),
  });

  revalidatePath("/data-master/kontak-darurat");
  redirectWithAlert(`Status kontak ${updated.name} diperbarui.`, "success");
}
