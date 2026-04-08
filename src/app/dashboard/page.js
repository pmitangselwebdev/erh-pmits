import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  Activity,
  Ambulance,
  ArrowUpRight,
  HeartPulse,
  Siren,
  Users,
} from "lucide-react";
import { getCurrentSessionProfile } from "@/lib/auth";
import {
  AMBULANCE_REQUEST_STATUS,
  AMBULANCE_UNIT_STATUS,
  INCIDENT_STATUS,
  REPORT_APPROVAL_STATUS,
  USER_STATUS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import OperationalMap from "@/components/dashboard/operational-map";
import LocationHeartbeat from "@/components/dashboard/location-heartbeat";

export const dynamic = 'force-dynamic';

function getDayBoundary() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/auth/callback");
  }

  const profile = await getCurrentSessionProfile();

  if (!profile) {
    // userId exists (Clerk auth works) but no system profile
    // → user needs to complete registration
    redirect("/registrasi");
  }

  if (profile.status === USER_STATUS.PENDING) {
    redirect("/menunggu");
  }

  if (profile.status === USER_STATUS.REJECTED) {
    redirect("/menunggu");
  }

  const { start, end } = getDayBoundary();

  const motorUnitsQuery =
    typeof db.motorUnit?.findMany === "function"
      ? db.motorUnit.findMany({
          where: {
            lastLatitude: { not: null },
            lastLongitude: { not: null },
          },
          orderBy: { updatedAt: "desc" },
          take: 300,
          select: {
            id: true,
            unitCode: true,
            vehicleName: true,
            status: true,
            lastLatitude: true,
            lastLongitude: true,
            lastLocationAt: true,
          },
        })
      : Promise.resolve([]);

  const [
    kejadianHariIni,
    kejadianAktif,
    pasienHariIni,
    rujukanHariIni,
    shiftOnDuty,
    activeUsers,
    ambulanceTersedia,
    incidentsMapRows,
    requestsMapRows,
    officersMapRows,
    unitsMapRows,
    motorsMapRows,
    onDutyRows,
  ] = await Promise.all([
    db.incident.count({
      where: { reportedAt: { gte: start, lt: end } },
    }),
    db.incident.count({
      where: { status: { in: [INCIDENT_STATUS.REPORTED, INCIDENT_STATUS.ON_PROCESS] } },
    }),
    db.ambulanceRequest.count({
      where: { createdAt: { gte: start, lt: end } },
    }),
    db.ambulanceRequest.count({
      where: {
        createdAt: { gte: start, lt: end },
        status: {
          in: [
            AMBULANCE_REQUEST_STATUS.PASIEN_DIANGKUT,
            AMBULANCE_REQUEST_STATUS.SELESAI,
          ],
        },
      },
    }),
    db.shiftAssignment.count({
      where: {
        date: { gte: start, lt: end },
      },
    }),
    db.user.count({
      where: { status: USER_STATUS.ACTIVE, isActive: true },
    }),
    db.ambulanceUnit.count({
      where: { status: AMBULANCE_UNIT_STATUS.STANDBY },
    }),
    db.incident.findMany({
      where: {
        approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
        status: { in: [INCIDENT_STATUS.REPORTED, INCIDENT_STATUS.ON_PROCESS, INCIDENT_STATUS.HANDLED] },
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { reportedAt: "desc" },
      take: 300,
      select: {
        id: true,
        incidentCode: true,
        incidentType: true,
        district: true,
        status: true,
        latitude: true,
        longitude: true,
        assignedOfficer: {
          select: { fullName: true },
        },
      },
    }),
    db.ambulanceRequest.findMany({
      where: {
        approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
        status: {
          in: [
            AMBULANCE_REQUEST_STATUS.MENUNGGU,
            AMBULANCE_REQUEST_STATUS.DALAM_PERJALANAN,
            AMBULANCE_REQUEST_STATUS.PASIEN_DIANGKUT,
          ],
        },
        pickupLatitude: { not: null },
        pickupLongitude: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        requestCode: true,
        patientName: true,
        status: true,
        pickupLatitude: true,
        pickupLongitude: true,
        unit: {
          select: {
            unitCode: true,
          },
        },
      },
    }),
    db.user.findMany({
      where: {
        status: USER_STATUS.ACTIVE,
        isActive: true,
        lastLatitude: { not: null },
        lastLongitude: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      take: 300,
      select: {
        id: true,
        fullName: true,
        officerType: true,
        lastLatitude: true,
        lastLongitude: true,
        lastLocationAt: true,
      },
    }),
    db.ambulanceUnit.findMany({
      where: {
        lastLatitude: { not: null },
        lastLongitude: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      take: 300,
      select: {
        id: true,
        unitCode: true,
        vehicleName: true,
        status: true,
        lastLatitude: true,
        lastLongitude: true,
        lastLocationAt: true,
      },
    }),
    motorUnitsQuery,
    db.shiftAssignment.findMany({
      where: {
        date: { gte: start, lt: end },
      },
      select: {
        userId: true,
        user: {
          select: {
            gender: true,
          },
        },
      },
    }),
  ]);

  const onDutySet = new Set(onDutyRows.map((item) => item.userId));
  const onDutyGenderMap = new Map();
  onDutyRows.forEach((item) => {
    if (!item.userId || onDutyGenderMap.has(item.userId)) return;
    const gender = String(item.user?.gender || "").trim().toUpperCase();
    onDutyGenderMap.set(item.userId, gender);
  });

  let onDutyMale = 0;
  let onDutyFemale = 0;
  onDutyGenderMap.forEach((gender) => {
    if (gender === "L" || gender === "LAKI-LAKI") onDutyMale += 1;
    if (gender === "P" || gender === "PEREMPUAN") onDutyFemale += 1;
  });

  const incidentsMap = incidentsMapRows.map((item) => ({
    ...item,
    assignedOfficerName: item.assignedOfficer?.fullName || null,
  }));

  const requestsMap = requestsMapRows.map((item) => ({
    ...item,
    unitCode: item.unit?.unitCode || null,
  }));

  const officersMap = officersMapRows
    .filter((item) => item.lastLocationAt)
    .map((item) => ({
      ...item,
      onDuty: onDutySet.has(item.id),
      lastLocationAt: item.lastLocationAt.toISOString(),
    }));

  const unitsMap = unitsMapRows
    .filter((item) => item.lastLocationAt)
    .map((item) => ({
      ...item,
      lastLocationAt: item.lastLocationAt.toISOString(),
    }));

  const motorsMap = motorsMapRows
    .filter((item) => item.lastLocationAt)
    .map((item) => ({
      ...item,
      lastLocationAt: item.lastLocationAt.toISOString(),
    }));

  const statCards = [
    {
      label: "Kejadian Hari Ini",
      value: String(kejadianHariIni),
      icon: Siren,
      tone: "critical",
    },
    {
      label: "Kejadian Aktif",
      value: String(kejadianAktif),
      icon: Activity,
      tone: "warning",
    },
    {
      label: "Pasien Hari Ini",
      value: String(pasienHariIni),
      icon: HeartPulse,
      tone: "info",
    },
    {
      label: "Rujukan Hari Ini",
      value: String(rujukanHariIni),
      icon: ArrowUpRight,
      tone: "support",
    },
    {
      label: "Petugas On Duty",
      value: `L ${onDutyMale} • P ${onDutyFemale}`,
      icon: Users,
      tone: "neutral",
    },
    {
      label: "Ambulance Tersedia",
      value: String(ambulanceTersedia),
      icon: Ambulance,
      tone: "positive",
    },
  ];

  return (
    <main className="min-h-screen">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand)]">
          Dashboard Operasional
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Emergency Response Hub PMI Kota Tangerang Selatan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ringkasan data hari ini untuk kejadian, ambulance, SDM, dan layanan rujukan.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Login sebagai {profile?.fullName || "Petugas"} ({profile?.role || "PETUGAS"})
        </p>
      </header>

      <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="dashboard-stat-card rounded-xl border border-border bg-card p-3 shadow-sm"
              data-tone={card.tone}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="dashboard-stat-label text-xs uppercase tracking-wide">{card.label}</p>
                  <p className="dashboard-stat-value mt-2 text-2xl font-bold">{card.value}</p>
                </div>
                <div className="dashboard-stat-chip flex h-10 w-10 items-center justify-center rounded-lg">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">Peta Operasional Kota Tangerang Selatan</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Menampilkan marker kejadian, permintaan ambulance, lokasi petugas, dan armada secara dinamis.
            </p>
          </div>
          <LocationHeartbeat />
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted p-2.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Marker Kejadian</p>
            <p className="mt-1 text-lg font-bold text-card-foreground">{incidentsMap.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted p-2.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Marker Permintaan</p>
            <p className="mt-1 text-lg font-bold text-card-foreground">{requestsMap.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted p-2.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Marker Petugas</p>
            <p className="mt-1 text-lg font-bold text-card-foreground">{officersMap.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted p-2.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Marker Armada</p>
            <p className="mt-1 text-lg font-bold text-card-foreground">{unitsMap.length + motorsMap.length}</p>
          </div>
        </div>

        <div className="mt-3">
          <OperationalMap />
        </div>
      </section>

      <section className="mt-3 grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold text-card-foreground">Aksi Cepat</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link
              href="/operasional/petugas-posko/kejadian"
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Buka Daftar Kejadian
            </Link>
            <Link
              href="/operasional/petugas-ambulance/permintaan"
              className="rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Kelola Permintaan Ambulance
            </Link>
            <Link
              href="/manajemen/sdm/approval"
              className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/90 transition-colors"
            >
              Approval Pengguna
            </Link>
            <Link
              href="/manajemen/logistik"
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Kelola Logistik
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold text-card-foreground">Status Sistem</h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>Semua modul utama aktif dan terhubung untuk operasional lapangan harian.</p>
            <p>Dashboard ini disiapkan dengan gaya panel admin untuk akses cepat lintas modul.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
