import { NextResponse } from "next/server";
import { getCurrentSessionProfile } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request, { params }) {
  try {
    const profile = await getCurrentSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Update notification to mark as read
    const notification = await db.notification.updateMany({
      where: {
        id: id,
        userId: profile.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    if (notification.count === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}