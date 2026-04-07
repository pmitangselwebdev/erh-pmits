import { db } from "@/lib/db";

export async function createAuditLog({
  userId,
  userName,
  action,
  module,
  details,
  ipAddress,
}) {
  await db.auditLog.create({
    data: {
      userId: userId || null,
      userName: userName || null,
      action,
      module,
      details,
      ipAddress: ipAddress || null,
    },
  });
}
