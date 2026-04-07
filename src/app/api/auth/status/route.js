import { getCurrentSessionProfile } from "@/lib/auth";
import { USER_STATUS } from "@/lib/constants";

export async function GET() {
  try {
    const profile = await getCurrentSessionProfile();
    
    if (!profile) {
      return Response.json({ 
        success: false, 
        message: "User not authenticated" 
      }, { status: 401 });
    }

    return Response.json({ 
      success: true, 
      status: profile.status,
      userId: profile.id
    });
  } catch (error) {
    console.error("Error checking user status:", error);
    return Response.json({ 
      success: false, 
      message: "Internal server error" 
    }, { status: 500 });
  }
}