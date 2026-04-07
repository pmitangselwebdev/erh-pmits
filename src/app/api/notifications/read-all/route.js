import { NextResponse } from "next/server";
import { getCurrentSessionProfile } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const profile = await getCurrentSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.notification.updateMany({
      where: {
        userId: profile.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}