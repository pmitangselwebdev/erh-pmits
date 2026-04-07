import { db } from "@/lib/db";

export async function createNotification({
  userId,
  title,
  message,
  category = "SYSTEM",
}) {
  if (!userId || !title || !message) return;

  await db.notification.create({
    data: {
      userId,
      title,
      message,
      category,
    },
  });
}

export async function createBulkNotifications({
  userIds,
  title,
  message,
  category = "SYSTEM",
}) {
  const distinctUserIds = [...new Set((userIds || []).filter(Boolean))];
  if (!distinctUserIds.length || !title || !message) return;

  await db.notification.createMany({
    data: distinctUserIds.map((userId) => ({
      userId,
      title,
      message,
      category,
    })),
  });
}
