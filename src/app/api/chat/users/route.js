import { NextResponse } from "next/server";
import { getCurrentSessionProfile } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const profile = await getCurrentSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users except current user (remove restrictive filters)
    const users = await db.user.findMany({
      where: {
        id: { not: profile.id },
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        officerType: true,
      },
      orderBy: {
        fullName: "asc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching chat users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}