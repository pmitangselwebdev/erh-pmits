import { NextResponse } from "next/server";
import { getCurrentSessionProfile } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const profile = await getCurrentSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: profile.id },
      select: { profilePicture: true, role: true },
    });

    return NextResponse.json({
      profilePicture: user?.profilePicture || null,
      role: user?.role || null,
    });
  } catch (error) {
    console.error("Error fetching profile picture:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}