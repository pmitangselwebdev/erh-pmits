import Link from "next/link";
import { getCurrentSessionProfile } from "@/lib/auth";
import {
  MEDICAL_DUTY_MODES,
  MEDICAL_EVENT_TYPES,
  MEDICAL_EVENT_POST_TYPES,
  MEDICAL_EVENT_STATUS,
  MEDICAL_FLEET_TYPES,
  MEDICAL_RUNNING_CATEGORIES,
  MEDICAL_STAFF_ROLES,
} from "@/lib/constants";
import { db } from "@/lib/db";
import {
  addMedicalLogisticPlan,
  assignMedicalTeamAndFleet,
  assignMedicalTeam,
  createMedicalEventPost,
  deleteMedicalTeamAssignment,
  deleteMedicalEvent,
  updateMedicalEventStatus,
  updateMedicalEvent,
  updateMedicalPostReadiness,
} from "./actions";
import EventInitiationForm from "./event-initiation-form";
import EventInjuryReportForm from "./event-injury-report-form";
import GpsLocationButton from "@/components/gps-location-button";
import ConfirmSubmitButton from "@/components/confirm-submit-button";

const EVENT_TYPE_OPTIONS = [
  { value: MEDICAL_EVENT_TYPES.LARI, label: "Lari" },
  { value: MEDICAL_EVENT_TYPES.SEPEDA, label: "Sepeda" },
  { value: MEDICAL_EVENT_TYPES.DRAG_RACE, label: "Drag Race" },
  { value: MEDICAL_EVENT_TYPES.ROADRACE, label: "Roadrace" },
  { value: MEDICAL_EVENT_TYPES.KONSER, label: "Konser" },
  { value: MEDICAL_EVENT_TYPES.LAINNYA, label: "Event Lainnya" },
];

const RUNNING_CATEGORY_OPTIONS = [
  { value: MEDICAL_RUNNING_CATEGORIES.FIVE_K, label: "5K" },
  { value: MEDICAL_RUNNING_CATEGORIES.TEN_K, label: "10K" },
  { value: MEDICAL_RUNNING_CATEGORIES.HALF_MARATHON, label: "HM" },
  { value: MEDICAL_RUNNING_CATEGORIES.FULL_MARATHON, label: "FM" },
];

const POST_TONES = ["critical", "warning", "info", "support", "neutral", "positive"];

function statusBadgeClass(status) {
  if (status === MEDICAL_EVENT_STATUS.CLOSED) return "bg-slate-200 text-slate-700";
  if (status === MEDICAL_EVENT_STATUS.COMPLETED) return "bg-blue-100 text-blue-700";
  if (status === MEDICAL_EVENT_STATUS.ONGOING) return "bg-rose-100 text-rose-700";
  if (status === MEDICAL_EVENT_STATUS.READY) return "bg-emerald-100 text-emerald-700";
  if (status === MEDICAL_EVENT_STATUS.PREPARATION) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function nextStatusAction(status) {
  if (status === MEDICAL_EVENT_STATUS.READY) {
    return { label: "Mulai Monitoring (ONGOING)", value: MEDICAL_EVENT_STATUS.ONGOING, color: "bg-rose-700" };
  }
  if (status === MEDICAL_EVENT_STATUS.ONGOING) {
    return { label: "Akhiri Event (COMPLETED)", value: MEDICAL_EVENT_STATUS.COMPLETED, color: "bg-blue-700" };
  }
  if (status === MEDICAL_EVENT_STATUS.COMPLETED) {
    return { label: "Tutup Event (CLOSED)", value: MEDICAL_EVENT_STATUS.CLOSED, color: "bg-slate-700" };
  }
  return null;
}

export default async function EventMedisPage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) return null;

  const resolvedSearchParams = await searchParams;
  const alert = String(resolvedSearchParams?.alert || "").trim();
  const alertType = String(resolvedSearchParams?.alertType || "error").trim();
  const tab = String(resolvedSearchParams?.tab || "inisiasi").trim();
  const selectedEventId = String(resolvedSearchParams?.eventId || "").trim();
  const editEventId = String(resolvedSearchParams?.editEventId || "").trim();
  const activeTab = ["inisiasi", "persiapan", "laporan"].includes(tab) ? tab : "inisiasi";

  const hasMedicalEventDelegate = typeof db.medicalEvent?.findMany === "function";
  const hasMedicalPostDelegate = typeof db.medicalEventPost?.findMany === "function";

  const eventsQuery =
    hasMedicalEventDelegate && hasMedicalPostDelegate
      ? db.medicalEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        posts: {
          include: {
            teamAssignments: {
              include: {
                user: {
                  select: { fullName: true },
                },
              },
            },
            fleetAssignments: {
              include: {
                ambulanceUnit: { select: { unitCode: true } },
                motorUnit: { select: { unitCode: true } },
              },
            },
            logisticPlans: true,
          },
          orderBy: { createdAt: "asc" },
        },
        injuryCards: {
          include: {
            post: { select: { postName: true } },
            officer: { select: { fullName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
    })
      : Promise.resolve([]);

  const selectedEventQuery = selectedEventId
    ? db.medicalEvent.findUnique({
      where: { id: selectedEventId },
      include: {
        posts: {
          include: {
            teamAssignments: {
              include: {
                user: { select: { fullName: true } },
              },
            },
            logisticPlans: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })
    : Promise.resolve(null);

  const editEventQuery = editEventId
    ? db.medicalEvent.findUnique({
      where: { id: editEventId },
      select: {
        id: true,
        eventName: true,
        eventType: true,
        eventTypeOther: true,
        runningCategories: true,
        organizerName: true,
        startAt: true,
        endAt: true,
        district: true,
        locationAddress: true,
        participantTarget: true,
        requiredDoctors: true,
        requiredParamedics: true,
        requiredNurses: true,
        requiredOtherOfficers: true,
        requiredAmbulances: true,
        requiredMotors: true,
      },
    })
    : Promise.resolve(null);

  const [events, users, ambulanceUnits, motorUnits, logisticItems, selectedEventDetail, editEventDetail] = await Promise.all([
    eventsQuery,
    db.user.findMany({
      where: { isActive: true, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    db.ambulanceUnit.findMany({
      where: { status: { in: ["STANDBY", "BERTUGAS"] } },
      orderBy: { unitCode: "asc" },
      select: { id: true, unitCode: true, status: true },
    }),
    db.motorUnit.findMany({
      where: { status: { in: ["STANDBY", "BERTUGAS"] } },
      orderBy: { unitCode: "asc" },
      select: { id: true, unitCode: true, status: true },
    }),
    db.logisticItem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    selectedEventQuery,
    editEventQuery,
  ]);

  const activeEvent = events[0] || null;
  const activeAction = activeEvent ? nextStatusAction(activeEvent.status) : null;
  const selectedEvent = selectedEventDetail || (selectedEventId ? events.find((event) => event.id === selectedEventId) : null);
  const editEvent = editEventDetail || (editEventId ? events.find((event) => event.id === editEventId) : null);

  const activeSummary = activeEvent
    ? activeEvent.posts.reduce(
        (acc, post) => {
          acc.totalPosts += 1;
          acc.readyPosts += post.isReady ? 1 : 0;
          acc.team += post.teamAssignments.length;
          acc.fleet += post.fleetAssignments.length;
          acc.logistic += post.logisticPlans.length;
          return acc;
        },
        { totalPosts: 0, readyPosts: 0, team: 0, fleet: 0, logistic: 0 }
      )
    : null;

  const teamRoleCounts = activeEvent
    ? activeEvent.posts.reduce(
        (acc, post) => {
          post.teamAssignments.forEach((assignment) => {
            if (assignment.staffRole === "DOKTER") acc.doctors += 1;
            if (assignment.staffRole === "PARAMEDIS") acc.paramedics += 1;
            if (assignment.staffRole === "PERAWAT") acc.nurses += 1;
            if (!Object.values(MEDICAL_STAFF_ROLES).includes(assignment.staffRole)) acc.others += 1;
          });
          post.fleetAssignments.forEach((assignment) => {
            if (assignment.fleetType === "AMBULANCE") acc.ambulances += 1;
            if (assignment.fleetType === "MOTOR") acc.motors += 1;
          });
          return acc;
        },
        { doctors: 0, paramedics: 0, nurses: 0, others: 0, ambulances: 0, motors: 0 }
      )
    : { doctors: 0, paramedics: 0, nurses: 0, others: 0, ambulances: 0, motors: 0 };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Operasional</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Event Medis</h1>
          <p className="mt-2 text-sm text-slate-600">
            Inisiasi kegiatan, persiapan tim-armada-logistik per pos, sampai validasi readiness event.
          </p>
        </header>

        {alert ? (
          <section className={`rounded-xl border px-4 py-3 text-sm ${
            alertType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}>
            {alert}
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link href="/operasional/event-medis?tab=inisiasi" className={`app-tab-btn ${activeTab === "inisiasi" ? "app-tab-btn-active" : ""}`}>
              Inisiasi Event
            </Link>
            <Link href="/operasional/event-medis?tab=persiapan" className={`app-tab-btn ${activeTab === "persiapan" ? "app-tab-btn-active" : ""}`}>
              Persiapan Event
            </Link>
            <Link href="/operasional/event-medis?tab=laporan" className={`app-tab-btn ${activeTab === "laporan" ? "app-tab-btn-active" : ""}`}>
              Lapor Kejadian
            </Link>
          </div>
        </section>

        {activeTab === "inisiasi" ? (
          <section className="grid items-start gap-6 lg:grid-cols-[1fr,2fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Inisiasi Event</h2>
              <EventInitiationForm />
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Event Medis Terbaru</h2>
              <p className="mt-1 text-xs text-slate-500">Menampilkan 20 event terbaru. Event paling baru dipakai sebagai konteks persiapan cepat.</p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-3 font-semibold">Kode</th>
                      <th className="px-3 py-3 font-semibold">Nama Event</th>
                      <th className="px-3 py-3 font-semibold">Periode</th>
                      <th className="px-3 py-3 font-semibold">Lokasi</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Pos</th>
                      <th className="px-3 py-3 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-slate-500">Belum ada event medis.</td>
                      </tr>
                    ) : null}
                    {events.map((event) => (
                      <tr key={event.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3 font-semibold text-slate-900">{event.eventCode}</td>
                        <td className="px-3 py-3 text-slate-700">{event.eventName}</td>
                        <td className="px-3 py-3 text-slate-700">
                          {new Date(event.startAt).toLocaleString("id-ID")}<br />
                          <span className="text-xs text-slate-500">s/d {new Date(event.endAt).toLocaleString("id-ID")}</span>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{event.district}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{event.status}</span>
                          <p className="mt-1 text-xs text-slate-500">
                            {event.eventType}
                            {event.runningCategories?.length ? ` • ${event.runningCategories.join(", ")}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{event.posts.length}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/operasional/event-medis?tab=inisiasi&eventId=${event.id}`}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              View Detail
                            </Link>
                            <Link
                              href={`/operasional/event-medis?tab=inisiasi&editEventId=${event.id}&eventId=${event.id}`}
                              className="rounded-md border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              Edit
                            </Link>
                            <form action={updateMedicalEventStatus} className="flex items-center gap-2">
                              <input type="hidden" name="eventId" value={event.id} />
                              <select
                                name="nextStatus"
                                defaultValue={event.status}
                                className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                              >
                                {Object.values(MEDICAL_EVENT_STATUS).map((status) => (
                                  <option key={`${event.id}-${status}`} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className="rounded-md bg-red-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-800"
                              >
                                Set Status
                              </button>
                            </form>
                            <form action={deleteMedicalEvent}>
                              <input type="hidden" name="eventId" value={event.id} />
                              <button
                                type="submit"
                                className="rounded-md bg-red-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-800"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {selectedEvent ? (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detail Event</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {selectedEvent.eventCode} - {selectedEvent.eventName}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(selectedEvent.startAt).toLocaleString("id-ID")} s/d {new Date(selectedEvent.endAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                  {activeEvent?.id === selectedEvent.id ? (
                    <Link
                      href={`/api/operasional/event-medis/${selectedEvent.id}/pdf`}
                      className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Export PDF
                    </Link>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Export PDF hanya untuk event aktif.</span>
                  )}
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-2 font-semibold">Nama Petugas</th>
                        <th className="px-3 py-2 font-semibold">Role Petugas</th>
                        <th className="px-3 py-2 font-semibold">Nama Pos</th>
                        <th className="px-3 py-2 font-semibold">Tipe Pos</th>
                        <th className="px-3 py-2 font-semibold">Lokasi Pos</th>
                        <th className="px-3 py-2 font-semibold">KM Point</th>
                        <th className="px-3 py-2 font-semibold">Long/Lat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEvent.posts.every((post) => post.teamAssignments.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                            Belum ada petugas pada pos event ini.
                          </td>
                        </tr>
                      ) : (
                        selectedEvent.posts.flatMap((post) =>
                          post.teamAssignments.map((assignment) => (
                            <tr key={assignment.id} className="border-b border-slate-100 last:border-b-0">
                              <td className="px-3 py-2 text-slate-700">{assignment.user?.fullName || "-"}</td>
                              <td className="px-3 py-2 text-slate-700">{assignment.staffRole}</td>
                              <td className="px-3 py-2 text-slate-700">{post.postName}</td>
                              <td className="px-3 py-2 text-slate-700">{post.postType}</td>
                              <td className="px-3 py-2 text-slate-700">{post.locationAddress}</td>
                              <td className="px-3 py-2 text-slate-700">{post.kmPoint || "-"}</td>
                              <td className="px-3 py-2 text-slate-700">
                                {post.latitude && post.longitude ? (
                                  <a
                                    className="text-blue-600 hover:text-blue-800"
                                    href={`https://maps.google.com/?q=${post.latitude},${post.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Lihat Lokasi
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold text-slate-700">Kebutuhan Logistik</p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-3 py-2 font-semibold">Nama Item Logistik</th>
                          <th className="px-3 py-2 font-semibold">Lokasi Pos</th>
                          <th className="px-3 py-2 font-semibold">Jumlah Item</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEvent.posts.every((post) => post.logisticPlans.length === 0) ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                              Belum ada kebutuhan logistik tercatat.
                            </td>
                          </tr>
                        ) : (
                          selectedEvent.posts.flatMap((post) =>
                            post.logisticPlans.map((plan) => (
                              <tr key={plan.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-3 py-2 text-slate-700">{plan.itemName}</td>
                                <td className="px-3 py-2 text-slate-700">{post.postName}</td>
                                <td className="px-3 py-2 text-slate-700">{plan.requiredQty}</td>
                              </tr>
                            ))
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            ) : null}

            {editEvent ? (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Edit Event Medis</h3>
                <form action={updateMedicalEvent} className="mt-4 space-y-3">
                  <input type="hidden" name="eventId" value={editEvent.id} />

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Nama Event
                    <input
                      required
                      name="eventName"
                      defaultValue={editEvent.eventName}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Jenis Event
                      <select
                        name="eventType"
                        defaultValue={editEvent.eventTypeOther ? MEDICAL_EVENT_TYPES.LAINNYA : editEvent.eventType}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        {EVENT_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Organizer
                      <input
                        name="organizerName"
                        defaultValue={editEvent.organizerName || ""}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Isi Jenis Event (jika lainnya)
                    <input
                      name="eventTypeOther"
                      defaultValue={editEvent.eventTypeOther || ""}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <legend className="px-1 text-xs font-semibold text-slate-700">Kategori Lari</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {RUNNING_CATEGORY_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            name="runningCategories"
                            value={option.value}
                            defaultChecked={editEvent.runningCategories?.includes(option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Mulai
                      <input
                        required
                        type="datetime-local"
                        name="startAt"
                        defaultValue={new Date(editEvent.startAt).toISOString().slice(0, 16)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Selesai
                      <input
                        required
                        type="datetime-local"
                        name="endAt"
                        defaultValue={new Date(editEvent.endAt).toISOString().slice(0, 16)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Kecamatan
                    <input
                      name="district"
                      defaultValue={editEvent.district || ""}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Lokasi Event
                    <textarea
                      required
                      rows={2}
                      name="locationAddress"
                      defaultValue={editEvent.locationAddress}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Target Peserta
                    <input
                      type="number"
                      min="0"
                      name="participantTarget"
                      defaultValue={editEvent.participantTarget ?? ""}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <legend className="px-1 text-xs font-semibold text-slate-700">Kebutuhan Tim & Armada</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Dokter<input type="number" min="0" name="requiredDoctors" defaultValue={editEvent.requiredDoctors} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Paramedis<input type="number" min="0" name="requiredParamedics" defaultValue={editEvent.requiredParamedics} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Perawat<input type="number" min="0" name="requiredNurses" defaultValue={editEvent.requiredNurses} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Petugas Lain<input type="number" min="0" name="requiredOtherOfficers" defaultValue={editEvent.requiredOtherOfficers} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Ambulance<input type="number" min="0" name="requiredAmbulances" defaultValue={editEvent.requiredAmbulances} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Motor Mobile<input type="number" min="0" name="requiredMotors" defaultValue={editEvent.requiredMotors} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                    </div>
                  </fieldset>

                  <button type="submit" className="w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Simpan Perubahan</button>
                </form>
              </article>
            ) : null}
          </section>
        ) : null}

        {activeTab !== "inisiasi" ? (activeEvent ? (
          <section className="space-y-6">
            {activeTab === "persiapan" ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monitoring Event Aktif</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{activeEvent.eventCode} - {activeEvent.eventName}</h3>
                  <p className="mt-1 text-xs text-slate-500">{new Date(activeEvent.startAt).toLocaleString("id-ID")} s/d {new Date(activeEvent.endAt).toLocaleString("id-ID")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(activeEvent.status)}`}>
                    {activeEvent.status}
                  </span>
                  {activeAction ? (
                    <form action={updateMedicalEventStatus}>
                      <input type="hidden" name="eventId" value={activeEvent.id} />
                      <input type="hidden" name="nextStatus" value={activeAction.value} />
                      <button type="submit" className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800">
                        {activeAction.label}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>

              {activeSummary ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] text-slate-500">Pos</p>
                    <p className="text-lg font-bold text-slate-900">{activeSummary.totalPosts}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[11px] text-emerald-700">Pos Ready</p>
                    <p className="text-lg font-bold text-emerald-700">{activeSummary.readyPosts}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] text-slate-500">Personel</p>
                    <p className="text-lg font-bold text-slate-900">{activeSummary.team}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] text-slate-500">Armada</p>
                    <p className="text-lg font-bold text-slate-900">{activeSummary.fleet}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] text-slate-500">Logistik</p>
                    <p className="text-lg font-bold text-slate-900">{activeSummary.logistic}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <p className="text-[11px] text-rose-700">Kartu Luka</p>
                    <p className="text-lg font-bold text-rose-700">{activeEvent.injuryCards.length}</p>
                  </div>
                </div>
              ) : null}


              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Need Dokter</p>
                  <p className="text-lg font-bold text-slate-900">{activeEvent.requiredDoctors}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Need Paramedis</p>
                  <p className="text-lg font-bold text-slate-900">{activeEvent.requiredParamedics}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Need Perawat</p>
                  <p className="text-lg font-bold text-slate-900">{activeEvent.requiredNurses}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Petugas Lain</p>
                  <p className="text-lg font-bold text-slate-900">{activeEvent.requiredOtherOfficers}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Need Ambulance</p>
                  <p className="text-lg font-bold text-slate-900">{activeEvent.requiredAmbulances}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Need Motor</p>
                  <p className="text-lg font-bold text-slate-900">{activeEvent.requiredMotors}</p>
                </div>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {([
                  { label: "Dokter", required: activeEvent.requiredDoctors, assigned: teamRoleCounts.doctors, tone: "critical" },
                  { label: "Paramedis", required: activeEvent.requiredParamedics, assigned: teamRoleCounts.paramedics, tone: "warning" },
                  { label: "Perawat", required: activeEvent.requiredNurses, assigned: teamRoleCounts.nurses, tone: "info" },
                  { label: "Petugas Lain", required: activeEvent.requiredOtherOfficers, assigned: teamRoleCounts.others, tone: "support" },
                  { label: "Ambulance", required: activeEvent.requiredAmbulances, assigned: teamRoleCounts.ambulances, tone: "neutral" },
                  { label: "Motor", required: activeEvent.requiredMotors, assigned: teamRoleCounts.motors, tone: "positive" },
                ]).map((item) => {
                  const isRequired = item.required > 0;
                  const isComplete = item.assigned >= item.required && isRequired;

                  return (
                    <div key={item.label} className="dashboard-stat-card rounded-lg border border-border px-2 py-1.5 shadow-sm" data-tone={item.tone}>
                      <p className="dashboard-stat-label text-[9px] font-semibold uppercase tracking-wide">{item.label}</p>
                      <p className="dashboard-stat-value mt-0.5 text-xs font-bold">
                        {item.assigned}/{item.required}
                      </p>
                      <p className="text-[9px] font-semibold text-white/80">
                        {isRequired ? (isComplete ? "Lengkap" : "Belum") : "N/A"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>
            ) : null}

            {activeTab === "persiapan" ? (
            <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
            <div className="space-y-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Persiapan Pos Event</h3>
                <p className="mt-1 text-xs text-slate-500">Event aktif: {activeEvent.eventCode} - {activeEvent.eventName}</p>
              </div>

              <form action={createMedicalEventPost} className="space-y-3 border-t border-slate-100 pt-4">
                <input type="hidden" name="eventId" value={activeEvent.id} />
                <input type="hidden" name="returnTab" value="persiapan" />
                <p className="text-xs font-semibold text-slate-700">Tambah Pos</p>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Nama Pos<input required name="postName" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Tipe Pos
                  <select name="postType" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {Object.values(MEDICAL_EVENT_POST_TYPES).map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">KM Point<input name="kmPoint" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Alamat Pos<input required name="locationAddress" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Lat<input id="event-post-latitude" name="latitude" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Lng<input id="event-post-longitude" name="longitude" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                </div>
                <GpsLocationButton
                  latitudeId="event-post-latitude"
                  longitudeId="event-post-longitude"
                  buttonClassName="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Dokter<input type="number" min="0" defaultValue="0" name="requiredDoctors" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Paramedis<input type="number" min="0" defaultValue="0" name="requiredParamedics" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Perawat<input type="number" min="0" defaultValue="0" name="requiredNurses" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Ambulance<input type="number" min="0" defaultValue="0" name="requiredAmbulances" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Motor<input type="number" min="0" defaultValue="0" name="requiredMotors" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                </div>
                <button type="submit" className="w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Simpan Pos</button>
              </form>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Daftar Petugas Aktif</h3>
                  <p className="mt-1 text-xs text-slate-500">Assign cepat petugas ke pos event aktif.</p>
                </div>
              </div>

              {activeEvent.posts.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">Tambahkan pos terlebih dahulu untuk melakukan assignment.</p>
              ) : (
                <div className="mt-3 space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {users.map((user) => (
                    <form
                      key={user.id}
                      action={assignMedicalTeam}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2"
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="returnTab" value="persiapan" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">{user.fullName}</span>
                        <select name="eventPostId" className="rounded-md border border-slate-300 px-2 py-1 text-[11px]">
                          {activeEvent.posts.map((post) => (
                            <option key={`assign-${user.id}-${post.id}`} value={post.id}>
                              {post.postName}
                            </option>
                          ))}
                        </select>
                        <select name="staffRole" className="rounded-md border border-slate-300 px-2 py-1 text-[11px]">
                          {Object.values(MEDICAL_STAFF_ROLES).map((role) => (
                            <option key={`assign-role-${user.id}-${role}`} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <select name="dutyMode" className="rounded-md border border-slate-300 px-2 py-1 text-[11px]">
                          <option value="STATIS">Statis</option>
                          <option value="AMBULANCE">Crew Ambulance</option>
                          <option value="MOTOR">Motor Mobile</option>
                        </select>
                        <button type="submit" className="ml-auto rounded-md bg-red-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-800">
                          Assign ke Event
                        </button>
                      </div>
                    </form>
                  ))}
                </div>
              )}
            </article>
            </div>

            <article className="space-y-4">
              {activeEvent.posts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
                  Belum ada pos pada event aktif.
                </div>
              ) : null}

              {activeEvent.posts.map((post, index) => (
                <div
                  key={post.id}
                  data-tone={POST_TONES[index % POST_TONES.length]}
                  className="dashboard-stat-card rounded-2xl border p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-white">{post.postName}</h4>
                      <p className="text-xs text-white/80">{post.postType} {post.kmPoint ? `• ${post.kmPoint}` : ""}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${post.isReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{post.isReady ? "READY" : "PREP"}</span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <form action={assignMedicalTeamAndFleet} className="rounded-xl border border-slate-200 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/80">
                      <input type="hidden" name="eventPostId" value={post.id} />
                      <input type="hidden" name="returnTab" value="persiapan" />
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-700">Assign Tim</p>
                          <select name="userId" className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs">
                            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                          </select>
                          <select name="staffRole" className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs">
                            {Object.values(MEDICAL_STAFF_ROLES).map((role) => <option key={role} value={role}>{role}</option>)}
                          </select>
                          <select name="dutyMode" className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs">
                            <option value="STATIS">Statis</option>
                            <option value="AMBULANCE">Crew Ambulance</option>
                            <option value="MOTOR">Motor Mobile</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-700">Assign Armada</p>
                          <p className="text-[11px] text-slate-500">Pilih tipe armada dan unit yang sesuai.</p>
                          <select name="fleetType" className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs">
                            <option value="">Tanpa Armada</option>
                            {Object.values(MEDICAL_FLEET_TYPES).map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <select name="ambulanceUnitId" className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs">
                              <option value="">Pilih Ambulance</option>
                              {ambulanceUnits.map((u) => <option key={u.id} value={u.id}>{u.unitCode} ({u.status})</option>)}
                            </select>
                            <select name="motorUnitId" className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs">
                              <option value="">Pilih Motor</option>
                              {motorUnits.map((u) => <option key={u.id} value={u.id}>{u.unitCode} ({u.status})</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                      <button type="submit" className="mt-3 w-full rounded-md bg-red-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-800">Simpan Tim & Armada</button>
                    </form>

                    <form action={addMedicalLogisticPlan} className="space-y-2 rounded-xl border border-slate-200 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/80">
                      <input type="hidden" name="eventPostId" value={post.id} />
                      <input type="hidden" name="returnTab" value="persiapan" />
                      <p className="text-xs font-semibold text-slate-700">Kebutuhan Logistik</p>
                      <div className="grid gap-2 lg:grid-cols-[1.3fr,1fr]">
                        <select name="logisticItemId" className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs">
                          <option value="">Pilih Item Master (opsional)</option>
                          {logisticItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                        </select>
                        <input name="itemName" placeholder="Nama item" className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" />
                      </div>
                      <input type="number" min="0" name="requiredQty" defaultValue="0" className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="Jumlah" />
                      <button type="submit" className="w-full rounded-md bg-red-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-800">Tambah Logistik</button>
                    </form>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/80">
                    <p className="text-xs font-semibold text-slate-700">Daftar Personil per Pos</p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="px-2 py-2 font-semibold">Nama</th>
                            <th className="px-2 py-2 font-semibold">Peran</th>
                            <th className="px-2 py-2 font-semibold">Mode</th>
                            <th className="px-2 py-2 font-semibold">Crew</th>
                            <th className="px-2 py-2 font-semibold">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {post.teamAssignments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-2 py-3 text-center text-slate-500">
                                Belum ada personil ditugaskan.
                              </td>
                            </tr>
                          ) : (
                            post.teamAssignments.map((assignment) => (
                              <tr key={assignment.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-2 py-2 text-slate-700">
                                  {assignment.user?.fullName || "-"}
                                </td>
                                <td className="px-2 py-2 text-slate-700">{assignment.staffRole}</td>
                                <td className="px-2 py-2 text-slate-700">{assignment.dutyMode}</td>
                                <td className="px-2 py-2 text-slate-700">
                                  {assignment.isAmbulanceCrew ? "Ambulance" : assignment.isMotorMobile ? "Motor" : "-"}
                                </td>
                                <td className="px-2 py-2 text-slate-700">
                                  <form action={deleteMedicalTeamAssignment}>
                                    <input type="hidden" name="assignmentId" value={assignment.id} />
                                    <input type="hidden" name="returnTab" value="persiapan" />
                                    <ConfirmSubmitButton
                                      label="Hapus"
                                      confirmMessage="Hapus assignment petugas ini?"
                                      className="rounded-md bg-red-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-800"
                                    />
                                  </form>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-[11px] text-slate-600">
                      Tim: {post.teamAssignments.length} personel · Armada: {post.fleetAssignments.length} unit · Logistik: {post.logisticPlans.length} item · {post.readinessNote || "Belum divalidasi"}
                    </p>
                    <form action={updateMedicalPostReadiness}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="returnTab" value="persiapan" />
                      <button type="submit" className="rounded-md bg-red-700 px-3 py-1 text-xs font-semibold text-white hover:bg-red-800">Validasi Ready</button>
                    </form>
                  </div>
                </div>
              ))}
            </article>
          </section>
            ) : null}

            {activeTab === "laporan" ? (
            <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          <EventInjuryReportForm eventId={activeEvent.id} posts={activeEvent.posts} />

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Monitoring Kartu Luka Event</h3>
            <p className="mt-1 text-xs text-slate-500">Maksimal 25 data terakhir pada event aktif.</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Kartu</th>
                    <th className="px-3 py-3 font-semibold">Korban</th>
                    <th className="px-3 py-3 font-semibold">Pos/Bib</th>
                    <th className="px-3 py-3 font-semibold">Triage</th>
                    <th className="px-3 py-3 font-semibold">Rujukan</th>
                    <th className="px-3 py-3 font-semibold">Petugas</th>
                    <th className="px-3 py-3 font-semibold">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEvent.injuryCards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">Belum ada kartu luka event.</td>
                    </tr>
                  ) : null}
                  {activeEvent.injuryCards.map((card) => (
                    <tr key={card.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 font-semibold text-slate-900">{card.cardNumber}</td>
                      <td className="px-3 py-3 text-slate-700">{card.victimName} {card.age ? `(${card.age})` : ""}</td>
                      <td className="px-3 py-3 text-slate-700">{card.post?.postName || "-"} {card.bibNumber ? `• #${card.bibNumber}` : ""}</td>
                      <td className="px-3 py-3"><span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">{card.triageLevel}</span></td>
                      <td className="px-3 py-3 text-slate-700">{card.referralRequired ? card.referralHospital || "YA" : "TIDAK"}</td>
                      <td className="px-3 py-3 text-slate-700">{card.officer?.fullName || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">{new Date(card.createdAt).toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          </section>
            ) : null}
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Belum ada event aktif. Buat event terlebih dahulu pada tab <span className="font-semibold">Inisiasi Event</span>, lalu lanjut ke tab <span className="font-semibold">Persiapan Event</span> atau <span className="font-semibold">Lapor Kejadian</span>.
          </section>
        )) : null}
      </div>

      {!hasMedicalEventDelegate || !hasMedicalPostDelegate ? (
        <section className="mx-auto mt-4 w-full max-w-7xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Model Event Medis belum tersedia di Prisma Client runtime. Jalankan <span className="font-semibold">npx prisma generate</span>, lanjutkan <span className="font-semibold">npx prisma db push</span>, lalu restart dev server.
        </section>
      ) : null}
    </main>
  );
}
