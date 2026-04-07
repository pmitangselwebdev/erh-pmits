"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import { AMBULANCE_UNIT_STATUS, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createAmbulanceUnitSchema } from "@/lib/validations/ambulance-unit";

const EDITABLE_STATUSES = new Set(Object.values(AMBULANCE_UNIT_STATUS));

function mapZodError(error) {
  if (!error?.issues?.length) return "Validasi input gagal.";
  return error.issues[0]?.message || "Validasi input gagal.";
}

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({
    alert: message,
    alertType: type,
  });
  redirect(`/data-master/ambulance-unit?${params.toString()}`);
}

export async function createAmbulanceUnit(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif untuk menambah unit ambulance.");
  }

  const payload = {
    unitCode: String(formData.get("unitCode") || "").trim(),
    plateNumber: String(formData.get("plateNumber") || "").trim(),
    vehicleName: String(formData.get("vehicleName") || "").trim(),
    conditionNote: String(formData.get("conditionNote") || "").trim(),
  };

  const parsed = createAmbulanceUnitSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlert(mapZodError(parsed.error));
  }

  const created = await db.ambulanceUnit
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
    module: "ambulance_unit",
    details: JSON.stringify({
      unitId: created.id,
      unitCode: created.unitCode,
      plateNumber: created.plateNumber,
      status: created.status,
    }),
  });

  revalidatePath("/data-master/ambulance-unit");
  redirectWithAlert(`Unit ${created.unitCode} berhasil ditambahkan.`, "success");
}

export async function updateAmbulanceUnitStatus(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif untuk mengubah status unit ambulance.");
  }

  const unitId = String(formData.get("unitId") || "").trim();
  const nextStatus = String(formData.get("nextStatus") || "").trim();
  const conditionNote = String(formData.get("conditionNote") || "").trim();

  if (!unitId || !EDITABLE_STATUSES.has(nextStatus)) {
    redirectWithAlert("Permintaan perubahan status unit tidak valid.");
  }

  if (nextStatus === AMBULANCE_UNIT_STATUS.STANDBY) {
    const activeRequestCount = await db.ambulanceRequest.count({
      where: {
        unitId,
        status: {
          in: ["MENUNGGU", "DALAM_PERJALANAN", "PASIEN_DIANGKUT"],
        },
      },
    });

    if (activeRequestCount > 0) {
      redirectWithAlert("Unit tidak dapat diubah ke STANDBY karena masih bertugas.");
    }
  }

  const updated = await db.ambulanceUnit.update({
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
    module: "ambulance_unit",
    details: JSON.stringify({
      unitId: updated.id,
      unitCode: updated.unitCode,
      status: updated.status,
      conditionNote: updated.conditionNote,
    }),
  });

  revalidatePath("/data-master/ambulance-unit");
  revalidatePath("/operasional/petugas-ambulance/permintaan");
  redirectWithAlert(`Status unit ${updated.unitCode} diubah ke ${updated.status}.`, "success");
}
