import { NextResponse } from "next/server";
import { getCurrentSessionProfile } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
    const profile = await getCurrentSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Set up SSE headers
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", userId: profile.id })}\n\n`));

        // Poll for new messages and notifications
        let lastMessageCheck = new Date();
        let lastNotificationCheck = new Date();

        const checkForUpdates = async () => {
          try {
            // Check for new messages
            const newMessages = await db.chatMessage.findMany({
              where: {
                receiverId: profile.id,
                createdAt: { gt: lastMessageCheck },
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    fullName: true,
                    role: true,
                  },
                },
              },
            });

            if (newMessages.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "new_messages",
                    messages: newMessages,
                    count: newMessages.length,
                  })}\n\n`
                )
              );
              lastMessageCheck = new Date();
            }

            // Check for new notifications
            const newNotifications = await db.notification.findMany({
              where: {
                userId: profile.id,
                createdAt: { gt: lastNotificationCheck },
              },
            });

            if (newNotifications.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "new_notifications",
                    notifications: newNotifications,
                    count: newNotifications.length,
                  })}\n\n`
                )
              );
              lastNotificationCheck = new Date();
            }
          } catch (error) {
            console.error("Error checking for updates:", error);
          }
        };

        // Check for updates every 1 second for real-time feel
        const interval = setInterval(checkForUpdates, 1000);

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(customReadable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in realtime route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}