"use server";

import { redirect } from "next/navigation";
import { getCurrentSessionProfile } from "@/lib/auth";
import { OFFICER_TYPES, SYSTEM_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";

const ALLOWED_OFFICER_TYPES = new Set(Object.values(OFFICER_TYPES));
const ALLOWED_ROLES = new Set([SYSTEM_ROLES.KOORDINATOR_POSKO, SYSTEM_ROLES.PETUGAS]);
const BLOOD_TYPES = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

function redirectWithAlert(message) {
  const params = new URLSearchParams({ alert: message });
  redirect(`/registrasi?${params.toString()}`);
}

export async function registerProfile(formData) {
  const profile = await getCurrentSessionProfile();
  if (!profile) {
    redirect("/sign-in");
  }

  const fullName = String(formData.get("fullName") || "").trim();
  const phoneNumber = String(formData.get("phoneNumber") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const bloodType = String(formData.get("bloodType") || "").trim();
  const officerType = String(formData.get("officerType") || "").trim();
  const role = String(formData.get("role") || "").trim();

  if (!fullName || fullName.length < 2) {
    redirectWithAlert("Nama lengkap minimal 2 karakter.");
  }
  if (!phoneNumber || phoneNumber.length < 8 || !/^\+?[\d\s\-()]{8,20}$/.test(phoneNumber)) {
    redirectWithAlert("Nomor telepon tidak valid (minimal 8 digit).");
  }
  if (!address || address.length < 5) {
    redirectWithAlert("Alamat minimal 5 karakter.");
  }
  if (!BLOOD_TYPES.has(bloodType)) {
    redirectWithAlert("Golongan darah tidak valid.");
  }
  if (!ALLOWED_OFFICER_TYPES.has(officerType)) {
    redirectWithAlert("Spesialisasi tidak valid.");
  }
  if (!ALLOWED_ROLES.has(role)) {
    redirectWithAlert("Role tidak valid.");
  }

  await db.user.update({
    where: { id: profile.id },
    data: {
      fullName,
      phoneNumber,
      address,
      bloodType,
      officerType,
      role,
    },
  });

  redirect("/menunggu");
}
