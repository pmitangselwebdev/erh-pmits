import { auth, currentUser } from "@clerk/nextjs/server";
import { SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";

function extractRoleFromMetadata(user) {
  const value = user?.publicMetadata?.role;
  return typeof value === "string" ? value : SYSTEM_ROLES.PETUGAS;
}

function extractStatusFromMetadata(user) {
  const value = user?.publicMetadata?.status;
  return typeof value === "string" ? value : USER_STATUS.PENDING;
}

export async function getCurrentSessionProfile() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  return {
    clerkUserId: user.id,
    email: user.primaryEmailAddress?.emailAddress || "",
    fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Tanpa Nama",
    role: extractRoleFromMetadata(user),
    status: extractStatusFromMetadata(user),
  };
}

export async function ensureSignedIn() {
  const { userId } = await auth();
  return Boolean(userId);
}
