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

    // Update message to mark as read
    const message = await db.chatMessage.updateMany({
      where: {
        id: id,
        receiverId: profile.id,
      },
      data: {
        isRead: true,
      },
    });

    if (message.count === 0) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking message as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}