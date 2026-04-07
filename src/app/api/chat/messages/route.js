import { NextResponse } from "next/server";
import { getCurrentSessionProfile } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const profile = await getCurrentSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get messages where user is sender or receiver
    const messages = await db.chatMessage.findMany({
      where: {
        OR: [{ senderId: profile.id }, { receiverId: profile.id }],
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Count unread messages
    const unreadCount = messages.filter(
      (m) => m.receiverId === profile.id && !m.isRead
    ).length;

    return NextResponse.json({ messages, unreadCount });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const profile = await getCurrentSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, content } = await request.json();

    if (!receiverId || !content?.trim()) {
      return NextResponse.json(
        { error: "Receiver ID and content are required" },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await db.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 }
      );
    }

    // Create message
    const message = await db.chatMessage.create({
      data: {
        senderId: profile.id,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}