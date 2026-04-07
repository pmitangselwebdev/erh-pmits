"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import { MOTOR_UNIT_STATUS, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createMotorUnitSchema } from "@/lib/validations/motor-unit";

const EDITABLE_STATUSES = new Set(Object.values(MOTOR_UNIT_STATUS));

function mapZodError(error) {
  if (!error?.issues?.length) return "Validasi input gagal.";
  return error.issues[0]?.message || "Validasi input gagal.";
}

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({
    alert: message,
    alertType: type,
  });
  redirect(`/data-master/motor-unit?${params.toString()}`);
}

export async function createMotorUnit(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif untuk menambah armada motor.");
  }

  const payload = {
    unitCode: String(formData.get("unitCode") || "").trim(),
    plateNumber: String(formData.get("plateNumber") || "").trim(),
    vehicleName: String(formData.get("vehicleName") || "").trim(),
    conditionNote: String(formData.get("conditionNote") || "").trim(),
  };

  const parsed = createMotorUnitSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlert(mapZodError(parsed.error));
  }

  const created = await db.motorUnit
    .create({
      data: {
        unitCode: parsed.data.unitCode,
        plateNumber: parsed.data.plateNumber,
        vehicleName: parsed.data.vehicleName,
        conditionNote: parsed.data.conditionNote || null,
      },
      select: {
        id: true,
        unitCode: true,
        plateNumber: true,
        vehicleName: true,
        status: true,
      },
    })
    .catch((error) => {
      const isUniqueViolation =
        error instanceof Error &&
        typeof error.message === "string" &&
        error.message.includes("Unique constraint failed");

      if (isUniqueViolation) {
        redirectWithAlert("Kode unit atau nomor polisi sudah digunakan.");
      }
      throw error;
    });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "motor_unit",
    details: JSON.stringify({
      unitId: created.id,
      unitCode: created.unitCode,
      plateNumber: created.plateNumber,
      status: created.status,
    }),
  });

  revalidatePath("/data-master/motor-unit");
  redirectWithAlert(`Armada ${created.unitCode} berhasil ditambahkan.`, "success");
}

export async function updateMotorUnitStatus(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif untuk mengubah status armada motor.");
  }

  const unitId = String(formData.get("unitId") || "").trim();
  const nextStatus = String(formData.get("nextStatus") || "").trim();
  const conditionNote = String(formData.get("conditionNote") || "").trim();

  if (!unitId || !EDITABLE_STATUSES.has(nextStatus)) {
    redirectWithAlert("Permintaan perubahan status armada motor tidak valid.");
  }

  const updated = await db.motorUnit.update({
    where: { id: unitId },
    data: {
      status: nextStatus,
      conditionNote: conditionNote || null,
    },
    select: {
      id: true,
      unitCode: true,
      status: true,
      conditionNote: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "STATUS_CHANGE",
    module: "motor_unit",
    details: JSON.stringify({
      unitId: updated.id,
      unitCode: updated.unitCode,
      status: updated.status,
      conditionNote: updated.conditionNote,
    }),
  });

  revalidatePath("/data-master/motor-unit");
  revalidatePath("/dashboard");
  redirectWithAlert(`Status armada ${updated.unitCode} diubah ke ${updated.status}.`, "success");
}
