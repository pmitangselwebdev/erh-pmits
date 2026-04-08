"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSessionProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const BLOOD_TYPES = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({ alert: message, alertType: type });
  redirect(`/pengaturan?${params.toString()}`);
}

export async function updateProfile(formData) {
  const profile = await getCurrentSessionProfile();
  if (!profile) {
    redirect("/auth/callback");
  }

  const fullName = String(formData.get("fullName") || "").trim();
  const phoneNumber = String(formData.get("phoneNumber") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const bloodType = String(formData.get("bloodType") || "").trim();
  const specialization = String(formData.get("specialization") || "").trim();

  if (!fullName || fullName.length < 2) {
    redirectWithAlert("Nama lengkap minimal 2 karakter.");
  }
  if (phoneNumber && !/^\+?[\d\s\-()\u00a0]{8,20}$/.test(phoneNumber)) {
    redirectWithAlert("Nomor telepon tidak valid (8–20 digit).");
  }
  if (address && address.length < 5) {
    redirectWithAlert("Alamat minimal 5 karakter.");
  }
  if (bloodType && !BLOOD_TYPES.has(bloodType)) {
    redirectWithAlert("Golongan darah tidak valid.");
  }

  await db.user.update({
    where: { id: profile.id },
    data: {
      fullName,
      phoneNumber: phoneNumber || null,
      address: address || null,
      bloodType: bloodType || null,
      specialization: specialization || null,
    },
  });

  redirectWithAlert("Profil berhasil diperbarui.", "success");
}

export async function updateProfilePicture(formData) {
  const profile = await getCurrentSessionProfile();
  if (!profile) {
    redirect("/auth/callback");
  }

  const file = formData.get("profilePicture");
  if (!file || file.size === 0) {
    redirectWithAlert("Pilih file foto profil terlebih dahulu.");
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    redirectWithAlert("Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.");
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    redirectWithAlert("Ukuran file terlalu besar. Maksimal 2MB.");
  }

  // Create upload directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), "public", "uploads", "profile-pictures");
  await mkdir(uploadDir, { recursive: true });

  // Generate unique filename
  const fileExtension = path.extname(file.name);
  const fileName = `${profile.id}-${Date.now()}${fileExtension}`;
  const filePath = path.join(uploadDir, fileName);

  // Convert file to buffer and save
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  // Update user profile picture in database
  const profilePictureUrl = `/uploads/profile-pictures/${fileName}`;
  await db.user.update({
    where: { id: profile.id },
    data: { profilePicture: profilePictureUrl },
  });

  redirectWithAlert("Foto profil berhasil diperbarui.", "success");
}

export async function markNotificationAsRead(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor) {
    redirectWithAlert("Sesi tidak valid.");
  }

  const notificationId = String(formData.get("notificationId") || "").trim();
  if (!notificationId) {
    redirectWithAlert("ID notifikasi tidak valid.");
  }

  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId: actor.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath("/pengaturan");
  redirectWithAlert("Notifikasi ditandai sudah dibaca.", "success");
}

export async function markAllNotificationsAsRead() {
  const actor = await getCurrentSessionProfile();
  if (!actor) {
    redirectWithAlert("Sesi tidak valid.");
  }

  await db.notification.updateMany({
    where: {
      userId: actor.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath("/pengaturan");
  redirectWithAlert("Semua notifikasi ditandai sudah dibaca.", "success");
}
