"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import { SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createReferralHospitalSchema } from "@/lib/validations/referral-hospital";

const ALLOWED_ROLES = new Set([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.KOORDINATOR_POSKO]);

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({ alert: message, alertType: type });
  redirect(`/data-master/rumah-sakit?${params.toString()}`);
}

function mapZodError(error) {
  if (!error?.issues?.length) return "Validasi input gagal.";
  return error.issues[0]?.message || "Validasi input gagal.";
}

export async function createReferralHospital(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE || !ALLOWED_ROLES.has(actor.role)) {
    redirectWithAlert("Anda tidak memiliki akses untuk mengelola rumah sakit.");
  }

  const payload = {
    name: String(formData.get("name") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    district: String(formData.get("district") || "").trim(),
    phoneNumber: String(formData.get("phoneNumber") || "").trim(),
    emergencyPhone: String(formData.get("emergencyPhone") || "").trim(),
    hasEmergencyUnit: String(formData.get("hasEmergencyUnit") || "") === "on",
    hasTraumaCenter: String(formData.get("hasTraumaCenter") || "") === "on",
    notes: String(formData.get("notes") || "").trim(),
  };

  const parsed = createReferralHospitalSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlert(mapZodError(parsed.error));
  }

  const created = await db.referralHospital.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      district: parsed.data.district,
      phoneNumber: parsed.data.phoneNumber || null,
      emergencyPhone: parsed.data.emergencyPhone || null,
      hasEmergencyUnit: parsed.data.hasEmergencyUnit,
      hasTraumaCenter: parsed.data.hasTraumaCenter,
      notes: parsed.data.notes || null,
    },
    select: {
      id: true,
      name: true,
      district: true,
      isActive: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "referral_hospital",
    details: JSON.stringify({
      hospitalId: created.id,
      name: created.name,
      district: created.district,
      isActive: created.isActive,
    }),
  });

  revalidatePath("/data-master/rumah-sakit");
  redirectWithAlert(`Rumah sakit ${created.name} berhasil ditambahkan.`, "success");
}

export async function toggleReferralHospital(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE || !ALLOWED_ROLES.has(actor.role)) {
    redirectWithAlert("Anda tidak memiliki akses untuk mengelola rumah sakit.");
  }

  const hospitalId = String(formData.get("hospitalId") || "").trim();
  const nextActive = String(formData.get("nextActive") || "").trim() === "true";
  if (!hospitalId) {
    redirectWithAlert("ID rumah sakit tidak valid.");
  }

  const updated = await db.referralHospital.update({
    where: { id: hospitalId },
    data: { isActive: nextActive },
    select: {
      id: true,
      name: true,
      district: true,
      isActive: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "STATUS_CHANGE",
    module: "referral_hospital",
    details: JSON.stringify({
      hospitalId: updated.id,
      name: updated.name,
      district: updated.district,
      isActive: updated.isActive,
    }),
  });

  revalidatePath("/data-master/rumah-sakit");
  redirectWithAlert(`Status rumah sakit ${updated.name} diperbarui.`, "success");
}
