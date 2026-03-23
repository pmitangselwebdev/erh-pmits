import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentSessionProfile } from "@/lib/auth";

const statCards = [
  { label: "Kejadian Hari Ini", value: "0" },
  { label: "Kejadian Aktif", value: "0" },
  { label: "Pasien Hari Ini", value: "0" },
  { label: "Rujukan Hari Ini", value: "0" },
  { label: "Petugas On Duty", value: "0" },
  { label: "Ambulance Tersedia", value: "0" },
];

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const profile = await getCurrentSessionProfile();

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Dashboard Operasional
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            SIM Posko PMI Kota Tangerang Selatan
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Login sebagai {profile?.fullName || "Petugas"} ({profile?.role || "PETUGAS"})
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <article
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{card.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Quick Access</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/operasional/petugas-posko/kejadian"
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              >
                Daftar Kejadian
              </Link>
              <Link
                href="/operasional/petugas-ambulance/permintaan"
                className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Permintaan Ambulance
              </Link>
              <Link
                href="/operasional/petugas-assessment/assessment"
                className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Daftar Assessment
              </Link>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Status Implementasi</h2>
            <p className="mt-3 text-sm text-slate-600">
              Halaman dashboard sudah aktif dan diproteksi autentikasi. Integrasi data
              real-time, peta Leaflet, notifikasi, dan statistik agregat akan dihubungkan
              bertahap pada sprint berikutnya.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
