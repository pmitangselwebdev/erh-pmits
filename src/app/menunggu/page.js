import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSessionProfile } from "@/lib/auth";
import { OFFICER_TYPES, SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import SignOutBtn from "@/components/sign-out-btn";

const OFFICER_TYPE_LABELS = {
  [OFFICER_TYPES.PETUGAS_POSKO]: "Petugas Posko",
  [OFFICER_TYPES.PETUGAS_ASSESSMENT]: "Petugas Assessment",
  [OFFICER_TYPES.PETUGAS_AMBULANCE]: "Petugas Ambulance",
};

const ROLE_LABELS = {
  [SYSTEM_ROLES.ADMIN]: "Admin",
  [SYSTEM_ROLES.KOORDINATOR_POSKO]: "Koordinator Posko",
  [SYSTEM_ROLES.PETUGAS]: "Petugas Operasional",
};

export default async function MenunggPage() {
  const profile = await getCurrentSessionProfile();
  if (!profile) redirect("/sign-in");

  const dbUser = await db.user.findUnique({
    where: { id: profile.id },
    select: {
      fullName: true,
      email: true,
      role: true,
      officerType: true,
      status: true,
      createdAt: true,
    },
  });

  if (!dbUser) redirect("/sign-in");

  if (dbUser.status === USER_STATUS.ACTIVE) {
    redirect("/dashboard");
  }

  if (!dbUser.officerType) {
    redirect("/registrasi");
  }

  const isRejected = dbUser.status === USER_STATUS.REJECTED;

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-red-50 dark:from-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold tracking-wide text-red-700">
            PMI Kota Tangerang Selatan
          </span>
          <div className="mt-5 flex justify-center">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
                isRejected ? "bg-rose-100" : "bg-amber-100"
              }`}
            >
              {isRejected ? "✕" : "⏳"}
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {isRejected ? "Akun Ditolak" : "Menunggu Persetujuan"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isRejected
              ? "Pengajuan akun Anda telah ditolak oleh Admin/Koordinator Posko."
              : "Profil Anda sudah tersimpan. Admin atau Koordinator Posko akan segera memverifikasi akun Anda."}
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Ringkasan Pendaftaran</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Nama</dt>
              <dd className="font-medium text-slate-900">{dbUser.fullName}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-700">{dbUser.email}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Pengajuan Role</dt>
              <dd className="font-medium text-slate-900">
                {ROLE_LABELS[dbUser.role] || dbUser.role}
              </dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Spesialisasi</dt>
              <dd className="text-slate-700">
                {OFFICER_TYPE_LABELS[dbUser.officerType] || dbUser.officerType || "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Tanggal Daftar</dt>
              <dd className="text-slate-700">
                {new Date(dbUser.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </div>

        {isRejected ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Hubungi Admin atau Koordinator Posko untuk informasi lebih lanjut mengenai penolakan akun Anda.
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Proses persetujuan biasanya berlangsung dalam 1×24 jam. Kamu bisa refresh halaman ini untuk memeriksa status terbaru.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/menunggu"
            className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Cek Status Terbaru
          </Link>
          <SignOutBtn className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50" />
        </div>
      </div>
    </main>
  );
}
