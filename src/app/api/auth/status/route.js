import { auth } from "@clerk/nextjs/server";
import { getCurrentSessionProfile } from "@/lib/auth";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({
        success: false,
        message: "User not authenticated",
      }, { status: 401 });
    }

    const profile = await getCurrentSessionProfile();

    if (!profile) {
      return Response.json({
        success: false,
        message: "Tidak dapat terhubung ke database. Coba lagi.",
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      status: profile.status,
      userId: profile.id,
    });
  } catch (error) {
    console.error("Error checking user status:", error);
    return Response.json({
      success: false,
      message: "Internal server error",
    }, { status: 500 });
  }
}