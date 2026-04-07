"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import { LOGISTIC_MOVEMENT_TYPES, SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { parseIntegerInput } from "@/lib/validations/incident";
import { createLogisticItemSchema } from "@/lib/validations/logistic-item";

const ALLOWED_ROLES = new Set([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.KOORDINATOR_POSKO]);

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({ alert: message, alertType: type });
  redirect(`/manajemen/logistik?${params.toString()}`);
}

function mapZodError(error) {
  if (!error?.issues?.length) return "Validasi input gagal.";
  return error.issues[0]?.message || "Validasi input gagal.";
}

export async function createLogisticItem(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE || !ALLOWED_ROLES.has(actor.role)) {
    redirectWithAlert("Anda tidak memiliki akses untuk mengelola logistik.");
  }

  const payload = {
    itemCode: String(formData.get("itemCode") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    unit: String(formData.get("unit") || "").trim(),
    currentStock: parseIntegerInput(formData.get("currentStock"), 0),
    minimumStock: parseIntegerInput(formData.get("minimumStock"), 0),
    storageLocation: String(formData.get("storageLocation") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  };

  const parsed = createLogisticItemSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlert(mapZodError(parsed.error));
  }

  const created = await db.logisticItem
    .create({
      data: {
        itemCode: parsed.data.itemCode,
        name: parsed.data.name,
        category: parsed.data.category,
        unit: parsed.data.unit,
        currentStock: parsed.data.currentStock,
        minimumStock: parsed.data.minimumStock,
        storageLocation: parsed.data.storageLocation || null,
        notes: parsed.data.notes || null,
      },
      select: {
        id: true,
        itemCode: true,
        name: true,
        currentStock: true,
        minimumStock: true,
      },
    })
    .catch((error) => {
      const isUniqueViolation =
        error instanceof Error &&
        typeof error.message === "string" &&
        error.message.includes("Unique constraint failed");
      if (isUniqueViolation) {
        redirectWithAlert("Kode logistik sudah dipakai.");
      }
      throw error;
    });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "logistic_item",
    details: JSON.stringify({
      itemId: created.id,
      itemCode: created.itemCode,
      name: created.name,
      currentStock: created.currentStock,
      minimumStock: created.minimumStock,
    }),
  });

  revalidatePath("/manajemen/logistik");
  redirectWithAlert(`Item ${created.itemCode} berhasil ditambahkan.`, "success");
}

export async function adjustLogisticStock(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE || !ALLOWED_ROLES.has(actor.role)) {
    redirectWithAlert("Anda tidak memiliki akses untuk mengelola logistik.");
  }

  const itemId = String(formData.get("itemId") || "").trim();
  const movementType = String(formData.get("movementType") || "").trim();
  const quantity = parseIntegerInput(formData.get("quantity"), 0);
  const note = String(formData.get("note") || "").trim();

  if (!itemId) {
    redirectWithAlert("ID item logistik tidak valid.");
  }
  if (!Object.values(LOGISTIC_MOVEMENT_TYPES).includes(movementType)) {
    redirectWithAlert("Jenis pergerakan stok tidak valid.");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    redirectWithAlert("Jumlah stok harus lebih dari 0.");
  }

  const current = await db.logisticItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      itemCode: true,
      name: true,
      currentStock: true,
      minimumStock: true,
    },
  });
  if (!current) {
    redirectWithAlert("Item logistik tidak ditemukan.");
  }

  const nextStock =
    movementType === LOGISTIC_MOVEMENT_TYPES.MASUK
      ? current.currentStock + quantity
      : current.currentStock - quantity;

  if (nextStock < 0) {
    redirectWithAlert("Stok tidak mencukupi untuk pengeluaran.");
  }

  const updated = await db.logisticItem.update({
    where: { id: itemId },
    data: {
      currentStock: nextStock,
      notes: note || undefined,
    },
    select: {
      id: true,
      itemCode: true,
      name: true,
      currentStock: true,
      minimumStock: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "UPDATE",
    module: "logistic_item",
    details: JSON.stringify({
      itemId: updated.id,
      itemCode: updated.itemCode,
      movementType,
      quantity,
      currentStock: updated.currentStock,
      minimumStock: updated.minimumStock,
      note,
    }),
  });

  revalidatePath("/manajemen/logistik");
  redirectWithAlert(`Stok item ${updated.itemCode} berhasil diperbarui.`, "success");
}
