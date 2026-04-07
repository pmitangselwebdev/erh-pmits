import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";

const ROLE_VALUES = new Set(Object.values(SYSTEM_ROLES));
const STATUS_VALUES = new Set(Object.values(USER_STATUS));

function extractRoleFromMetadata(user) {
  const value = user?.publicMetadata?.role;
  if (typeof value === "string" && ROLE_VALUES.has(value)) {
    return value;
  }
  return SYSTEM_ROLES.PETUGAS;
}

function extractStatusFromMetadata(user) {
  const value = user?.publicMetadata?.status;
  if (typeof value === "string" && STATUS_VALUES.has(value)) {
    return value;
  }
  return USER_STATUS.PENDING;
}

function buildDisplayName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Tanpa Nama";
}

function shouldBootstrapAdmin(clerkUserId) {
  const configuredId = process.env.BOOTSTRAP_ADMIN_CLERK_USER_ID;
  return Boolean(configuredId && configuredId === clerkUserId);
}

export async function syncCurrentUserFromClerk() {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await currentUser();
    if (!user) return null;

    const email = user.primaryEmailAddress?.emailAddress || "";
    if (!email) return null;

    const roleFromMetadata = extractRoleFromMetadata(user);
    const statusFromMetadata = extractStatusFromMetadata(user);
    const bootstrapAdmin = shouldBootstrapAdmin(user.id);

    const createdRole = bootstrapAdmin ? SYSTEM_ROLES.ADMIN : roleFromMetadata;
    const createdStatus = bootstrapAdmin ? USER_STATUS.ACTIVE : statusFromMetadata;

    // First, try to find user by clerkUserId
    let systemUser = await db.user.findUnique({
      where: { clerkUserId: user.id },
    });

    if (systemUser) {
      // User exists with this clerkUserId, update email if different
      if (systemUser.email !== email) {
        systemUser = await db.user.update({
          where: { id: systemUser.id },
          data: { email },
        });
      }
    } else {
      // Check if user exists with this email but different clerkUserId
      const existingUserWithEmail = await db.user.findUnique({
        where: { email },
      });

      if (existingUserWithEmail) {
        // Update the existing user with new clerkUserId
        systemUser = await db.user.update({
          where: { id: existingUserWithEmail.id },
          data: {
            clerkUserId: user.id,
            fullName: buildDisplayName(user),
            role: createdRole,
            status: createdStatus,
            isActive: createdStatus === USER_STATUS.ACTIVE,
            joinedAt: createdStatus === USER_STATUS.ACTIVE ? new Date() : null,
          },
        });
      } else {
        // Create new user
        systemUser = await db.user.create({
          data: {
            clerkUserId: user.id,
            email,
            fullName: buildDisplayName(user),
            role: createdRole,
            status: createdStatus,
            isActive: createdStatus === USER_STATUS.ACTIVE,
            joinedAt: createdStatus === USER_STATUS.ACTIVE ? new Date() : null,
          },
        });
      }
    }

    return systemUser;
  } catch (error) {
    console.error("Error syncing user from Clerk:", error);
    // Return null instead of throwing to prevent app crash
    return null;
  }
}

export async function getCurrentSessionProfile() {
  const systemUser = await syncCurrentUserFromClerk();
  if (!systemUser) return null;

  // Get the latest user data from database to ensure we have the most recent name
  const latestUserData = await db.user.findUnique({
    where: { id: systemUser.id },
    select: {
      fullName: true,
      email: true,
      phoneNumber: true,
      address: true,
      bloodType: true,
      profilePicture: true,
      officerType: true,
      specialization: true,
      role: true,
      status: true,
      isActive: true,
    },
  });

  if (!latestUserData) return null;

  return {
    id: systemUser.id,
    clerkUserId: systemUser.clerkUserId,
    email: latestUserData.email,
    fullName: latestUserData.fullName,
    role: latestUserData.role,
    status: latestUserData.status,
    officerType: latestUserData.officerType,
    isActive: latestUserData.isActive,
  };
}

export async function ensureSignedIn() {
  const { userId } = await auth();
  return Boolean(userId);
}
