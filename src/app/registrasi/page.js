import { redirect } from "next/navigation";
import { getCurrentSessionProfile } from "@/lib/auth";
import { OFFICER_TYPES, SPECIALIZATIONS, SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { registerProfile } from "./actions";
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const OFFICER_TYPE_LABELS = {
  [OFFICER_TYPES.PETUGAS_POSKO]: "Petugas Posko — Penerimaan laporan & koordinasi kejadian",
  [OFFICER_TYPES.PETUGAS_ASSESSMENT]: "Petugas Assessment — SAR & penilaian lapangan",
  [OFFICER_TYPES.PETUGAS_AMBULANCE]: "Petugas Ambulance — Transportasi medis & SPGDT",
};

const ROLE_LABELS = {
  [SYSTEM_ROLES.KOORDINATOR_POSKO]: "Koordinator Posko",
  [SYSTEM_ROLES.PETUGAS]: "Petugas Operasional",
};

export default async function RegistrasiPage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) redirect("/sign-in");

  const dbUser = await db.user.findUnique({
    where: { id: profile.id },
    select: {
      fullName: true,
      email: true,
      phoneNumber: true,
      address: true,
      bloodType: true,
      officerType: true,
      role: true,
      status: true,
    },
  });

  if (!dbUser) redirect("/sign-in");

  if (dbUser.status === USER_STATUS.ACTIVE) {
    redirect("/dashboard");
  }

  if (dbUser.phoneNumber && dbUser.officerType) {
    redirect("/menunggu");
  }

  const resolvedParams = await searchParams;
  const alert = String(resolvedParams?.alert || "").trim();

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-red-50 dark:from-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold tracking-wide text-red-700">
            PMI Kota Tangerang Selatan
          </span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Lengkapi Profil Anda</h1>
          <p className="mt-1 text-sm text-slate-600">
            Data ini digunakan untuk penugasan operasional di lingkungan PMI.
          </p>
        </header>

        {alert ? (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {alert}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-xs text-slate-500">Login sebagai</p>
              <p className="text-sm font-semibold text-slate-900">{dbUser?.email || profile.email}</p>
            </div>
          </div>

          <form action={registerProfile} className="space-y-4">
            <Field>
              <FieldLabel>Nama Lengkap</FieldLabel>
              <input
                required
                name="fullName"
                defaultValue={dbUser?.fullName || profile.fullName}
                placeholder="Nama lengkap sesuai identitas"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none"
              />
            </Field>

            <Field>
              <FieldLabel>Nomor Telepon / WhatsApp</FieldLabel>
              <input
                required
                name="phoneNumber"
                type="tel"
                placeholder="08xxxxxxxxxx"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none"
              />
            </Field>

            <Field>
              <FieldLabel>Alamat Tinggal</FieldLabel>
              <textarea
                required
                name="address"
                rows={2}
                placeholder="Jl. ... No. ..., Kelurahan, Kecamatan"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none"
              />
            </Field>

            <Field>
              <FieldLabel>Golongan Darah</FieldLabel>
              <select
                required
                name="bloodType"
                defaultValue={dbUser?.bloodType || ""}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none"
              >
                <option value="" disabled>Pilih golongan darah</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel>Jenis Petugas</FieldLabel>
              <select
                required
                name="officerType"
                defaultValue={dbUser?.officerType || ""}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none"
              >
                <option value="" disabled>Pilih jenis petugas</option>
                {Object.entries(OFFICER_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel>Spesialisasi</FieldLabel>
              <select
                name="specialization"
                defaultValue={dbUser?.specialization || ""}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none"
              >
                <option value="" disabled>Pilih spesialisasi</option>
                {Object.entries(SPECIALIZATIONS).map(([key, value]) => (
                  <option key={value} value={value}>{key}</option>
                ))}
              </select>
            </Field>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-semibold text-slate-700">Pengajuan Role</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 has-[:checked]:border-red-400 has-[:checked]:bg-red-50 has-[:checked]:text-red-700"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      defaultChecked={dbUser?.role === value}
                      required
                      className="accent-red-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Role final akan ditentukan oleh Admin/Koordinator saat proses persetujuan.
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Daftarkan Profil Saya
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
