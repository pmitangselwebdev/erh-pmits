import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSessionProfile } from "@/lib/auth";
import { OFFICER_TYPES, SHIFT_TYPES, SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { deleteUser, updateUserApproval, updateUserProfile } from "./actions";
import { createShiftAssignment, deleteShiftAssignment } from "./shift/actions";
import { confirmHandoverShift, createHandoverShift } from "./handover/actions";

const ALLOWED_ROLES = new Set([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.KOORDINATOR_POSKO]);

function handoverStatusClass(status) {
  if (status === "CONFIRMED") return "bg-emerald-100 text-emerald-700";
  if (status === "SUBMITTED") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function userStatusClass(status) {
  if (status === USER_STATUS.ACTIVE) return "bg-emerald-100 text-emerald-700";
  if (status === USER_STATUS.REJECTED) return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

export default async function ManajemenSDMPage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) return null;

  if (!ALLOWED_ROLES.has(profile.role)) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const tab = String(resolvedSearchParams?.tab || "approval").trim();
  const activeTab = ["approval", "users", "shift", "handover"].includes(tab) ? tab : "approval";
  const alert = String(resolvedSearchParams?.alert || "").trim();
  const alertType = String(resolvedSearchParams?.alertType || "error").trim();
  const editUserId = String(resolvedSearchParams?.editUserId || "").trim();

  const [pendingUsers, activeUsers, shiftUsers, shifts, officers, incidents, handovers] =
    await Promise.all([
      // Tab: approval — pending users
      db.user.findMany({
        where: { status: USER_STATUS.PENDING },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          officerType: true,
          createdAt: true,
          status: true,
        },
      }),
      // Tab: users — all approved users
      db.user.findMany({
        where: { status: USER_STATUS.ACTIVE },
        orderBy: [{ officerType: "asc" }, { fullName: "asc" }],
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          officerType: true,
          gender: true,
          specialization: true,
          isActive: true,
          joinedAt: true,
        },
      }),
      // Tab: shift — active users for assignment
      db.user.findMany({
        where: { status: USER_STATUS.ACTIVE, isActive: true },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, officerType: true },
      }),
      // Tab: shift — shift list
      db.shiftAssignment.findMany({
        orderBy: [{ date: "desc" }, { shiftType: "asc" }],
        take: 150,
        select: {
          id: true,
          date: true,
          shiftType: true,
          officerType: true,
          user: { select: { fullName: true } },
        },
      }),
      // Tab: handover — officers for multi-select
      db.user.findMany({
        where: { isActive: true, status: "ACTIVE" },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, officerType: true },
      }),
      // Tab: handover — active incidents
      db.incident.findMany({
        where: { status: { in: ["REPORTED", "ON_PROCESS", "HANDLED"] } },
        orderBy: { reportedAt: "desc" },
        take: 80,
        select: {
          id: true,
          incidentCode: true,
          incidentType: true,
          district: true,
          status: true,
        },
      }),
      // Tab: handover — handover history
      db.handoverShift.findMany({
        orderBy: { handoverDate: "desc" },
        take: 80,
        select: {
          id: true,
          handoverDate: true,
          previousShift: true,
          nextShift: true,
          previousOfficerIds: true,
          nextOfficerIds: true,
          activeIncidentIds: true,
          notes: true,
          constraints: true,
          requiredNeeds: true,
          status: true,
          confirmedAt: true,
          createdAt: true,
        },
      }),
    ]);

  const officerMap = new Map(officers.map((item) => [item.id, item.fullName]));
  const incidentMap = new Map(incidents.map((item) => [item.id, item.incidentCode]));

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Manajemen
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">SDM Posko</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kelola approval user, daftar petugas aktif, penjadwalan shift, dan serah terima shift.
          </p>
        </header>

        {/* Tab Navigation */}
        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link
              href="/manajemen/sdm?tab=approval"
              className={`app-tab-btn ${activeTab === "approval" ? "app-tab-btn-active" : ""}`}
            >
              Approval User
              {pendingUsers.length > 0 ? (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                  {pendingUsers.length}
                </span>
              ) : null}
            </Link>
            <Link
              href="/manajemen/sdm?tab=users"
              className={`app-tab-btn ${activeTab === "users" ? "app-tab-btn-active" : ""}`}
            >
              Semua Petugas
            </Link>
            <Link
              href="/manajemen/sdm?tab=shift"
              className={`app-tab-btn ${activeTab === "shift" ? "app-tab-btn-active" : ""}`}
            >
              Shift Petugas
            </Link>
            <Link
              href="/manajemen/sdm?tab=handover"
              className={`app-tab-btn ${activeTab === "handover" ? "app-tab-btn-active" : ""}`}
            >
              Serah Terima
            </Link>
          </div>
        </section>

        {alert ? (
          <section
            className={`rounded-xl border px-4 py-3 text-sm ${
              alertType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {alert}
          </section>
        ) : null}

        {/* ── Tab: Approval ── */}
        {activeTab === "approval" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Approval User</h2>
            <p className="mt-1 text-xs text-slate-500">
              Daftar akun dengan status pending yang menunggu persetujuan.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/sign-up"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
              >
                Tambah Petugas
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Nama</th>
                    <th className="px-3 py-3 font-semibold">Email</th>
                    <th className="px-3 py-3 font-semibold">Role</th>
                    <th className="px-3 py-3 font-semibold">Jenis Petugas</th>
                    <th className="px-3 py-3 font-semibold">Tanggal Daftar</th>
                    <th className="px-3 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        Tidak ada user pending saat ini.
                      </td>
                    </tr>
                  ) : null}

                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-900">{user.fullName}</td>
                      <td className="px-3 py-3 text-slate-700">{user.email}</td>
                      <td className="px-3 py-3 text-slate-700">{user.role}</td>
                      <td className="px-3 py-3 text-slate-700">{user.officerType || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {new Date(user.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <form action={updateUserApproval}>
                            <input type="hidden" name="targetUserId" value={user.id} />
                            <input type="hidden" name="nextStatus" value={USER_STATUS.ACTIVE} />
                            <button
                              type="submit"
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                          </form>
                          <form action={updateUserApproval}>
                            <input type="hidden" name="targetUserId" value={user.id} />
                            <input type="hidden" name="nextStatus" value={USER_STATUS.REJECTED} />
                            <button
                              type="submit"
                              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                              Reject
                            </button>
                          </form>
                          <form action={deleteUser}>
                            <input type="hidden" name="targetUserId" value={user.id} />
                            <button
                              type="submit"
                              className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-300"
                            >
                              Hapus
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* ── Tab: All Approved Users ── */}
        {activeTab === "users" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Semua Petugas Aktif</h2>
            <p className="mt-1 text-xs text-slate-500">
              {activeUsers.length} akun dengan status ACTIVE terdaftar.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Kelola Data Petugas</p>
                <p className="text-[11px] text-slate-500">Gunakan form ini untuk update data petugas.</p>
              </div>
              <Link
                href="/sign-up"
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Tambah Petugas
              </Link>
            </div>

            {editUserId ? (
              <form
                action={updateUserProfile}
                className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
              >
                <input type="hidden" name="targetUserId" value={editUserId} />
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Role
                  <select
                    name="role"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    defaultValue={activeUsers.find((user) => user.id === editUserId)?.role || SYSTEM_ROLES.PETUGAS}
                  >
                    {Object.values(SYSTEM_ROLES).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Jenis Petugas
                  <select
                    name="officerType"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    defaultValue={activeUsers.find((user) => user.id === editUserId)?.officerType || ""}
                  >
                    <option value="">-</option>
                    {Object.values(OFFICER_TYPES).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Spesialisasi
                  <input
                    name="specialization"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    defaultValue={activeUsers.find((user) => user.id === editUserId)?.specialization || ""}
                    placeholder="Contoh: PARAMEDIK"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Gender
                  <select
                    name="gender"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    defaultValue={activeUsers.find((user) => user.id === editUserId)?.gender || ""}
                  >
                    <option value="">-</option>
                    <option value="L">L (Laki-laki)</option>
                    <option value="P">P (Perempuan)</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Status Aktif
                  <select
                    name="isActive"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    defaultValue={activeUsers.find((user) => user.id === editUserId)?.isActive ? "true" : "false"}
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Tidak Aktif</option>
                  </select>
                </label>

                <div className="flex items-end gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Simpan Perubahan
                  </button>
                  <Link
                    href="/manajemen/sdm?tab=users"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Batal
                  </Link>
                </div>
              </form>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Nama</th>
                    <th className="px-3 py-3 font-semibold">Email</th>
                    <th className="px-3 py-3 font-semibold">Role</th>
                    <th className="px-3 py-3 font-semibold">Jenis Petugas</th>
                    <th className="px-3 py-3 font-semibold">Spesialisasi</th>
                    <th className="px-3 py-3 font-semibold">Gender</th>
                    <th className="px-3 py-3 font-semibold">Status Aktif</th>
                    <th className="px-3 py-3 font-semibold">Bergabung</th>
                    <th className="px-3 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                        Belum ada petugas aktif.
                      </td>
                    </tr>
                  ) : null}

                  {activeUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 font-medium text-slate-900">{user.fullName}</td>
                      <td className="px-3 py-3 text-slate-700">{user.email}</td>
                      <td className="px-3 py-3 text-slate-700">{user.role}</td>
                      <td className="px-3 py-3 text-slate-700">{user.officerType || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">{user.specialization || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">{user.gender || "-"}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {user.isActive ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {user.joinedAt
                          ? new Date(user.joinedAt).toLocaleDateString("id-ID")
                          : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/manajemen/sdm?tab=users&editUserId=${user.id}`}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </Link>
                          <form action={deleteUser}>
                            <input type="hidden" name="targetUserId" value={user.id} />
                            <button
                              type="submit"
                              className="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700"
                            >
                              Hapus
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* ── Tab: Shift ── */}
        {activeTab === "shift" ? (
          <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Tambah Shift</h2>
              <form action={createShiftAssignment} className="mt-4 space-y-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Petugas
                  <select
                    required
                    name="userId"
                    defaultValue=""
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">Pilih Petugas</option>
                    {shiftUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName} {user.officerType ? `(${user.officerType})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Tanggal
                  <input
                    required
                    type="date"
                    name="date"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Shift
                  <select
                    required
                    name="shiftType"
                    defaultValue={SHIFT_TYPES.SIANG}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {Object.values(SHIFT_TYPES).map((shift) => (
                      <option key={shift} value={shift}>
                        {shift}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Jenis Petugas
                  <select
                    required
                    name="officerType"
                    defaultValue={OFFICER_TYPES.PETUGAS_POSKO}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {Object.values(OFFICER_TYPES).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Simpan Shift
                </button>
              </form>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Daftar Shift</h2>
              <p className="mt-1 text-xs text-slate-500">Menampilkan 150 jadwal terbaru.</p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-3 font-semibold">Tanggal</th>
                      <th className="px-3 py-3 font-semibold">Shift</th>
                      <th className="px-3 py-3 font-semibold">Petugas</th>
                      <th className="px-3 py-3 font-semibold">Jenis</th>
                      <th className="px-3 py-3 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                          Belum ada jadwal shift.
                        </td>
                      </tr>
                    ) : null}

                    {shifts.map((shift) => (
                      <tr key={shift.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3 text-slate-700">
                          {new Date(shift.date).toLocaleDateString("id-ID")}
                        </td>
                        <td className="px-3 py-3 text-slate-700">{shift.shiftType}</td>
                        <td className="px-3 py-3 text-slate-900">{shift.user.fullName}</td>
                        <td className="px-3 py-3 text-slate-700">{shift.officerType}</td>
                        <td className="px-3 py-3">
                          <form action={deleteShiftAssignment}>
                            <input type="hidden" name="shiftId" value={shift.id} />
                            <button
                              type="submit"
                              className="rounded-md bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              Hapus
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        ) : null}

        {/* ── Tab: Handover ── */}
        {activeTab === "handover" ? (
          <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Buat Handover</h2>
              <form action={createHandoverShift} className="mt-4 space-y-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Tanggal Handover
                  <input
                    required
                    type="date"
                    name="handoverDate"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Shift Sebelumnya
                    <select
                      name="previousShift"
                      defaultValue={SHIFT_TYPES.SIANG}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    >
                      {Object.values(SHIFT_TYPES).map((shift) => (
                        <option key={shift} value={shift}>
                          {shift}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Shift Berikutnya
                    <select
                      name="nextShift"
                      defaultValue={SHIFT_TYPES.MALAM}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    >
                      {Object.values(SHIFT_TYPES).map((shift) => (
                        <option key={shift} value={shift}>
                          {shift}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Petugas Shift Sebelumnya
                  <select
                    name="previousOfficerIds"
                    multiple
                    className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {officers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.fullName}{officer.officerType ? ` (${officer.officerType})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Petugas Shift Berikutnya
                  <select
                    name="nextOfficerIds"
                    multiple
                    className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {officers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.fullName}{officer.officerType ? ` (${officer.officerType})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Kejadian Aktif
                  <select
                    name="activeIncidentIds"
                    multiple
                    className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {incidents.map((incident) => (
                      <option key={incident.id} value={incident.id}>
                        {incident.incidentCode} · {incident.incidentType} · {incident.status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Catatan
                  <textarea
                    name="notes"
                    rows={2}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Kendala
                  <textarea
                    name="constraints"
                    rows={2}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Kebutuhan Lanjutan
                  <textarea
                    name="requiredNeeds"
                    rows={2}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Simpan Handover
                </button>
              </form>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Riwayat Handover</h2>
              <p className="mt-1 text-xs text-slate-500">Menampilkan 80 handover terbaru.</p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-3 font-semibold">Tanggal</th>
                      <th className="px-3 py-3 font-semibold">Shift</th>
                      <th className="px-3 py-3 font-semibold">Petugas</th>
                      <th className="px-3 py-3 font-semibold">Kejadian Aktif</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handovers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                          Belum ada data handover.
                        </td>
                      </tr>
                    ) : null}

                    {handovers.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 align-top last:border-b-0">
                        <td className="px-3 py-3 text-slate-700">
                          <p>{new Date(item.handoverDate).toLocaleDateString("id-ID")}</p>
                          <p className="text-xs text-slate-500">
                            Dibuat {new Date(item.createdAt).toLocaleString("id-ID")}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {item.previousShift} → {item.nextShift}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          <p className="text-xs text-slate-500">Prev:</p>
                          <p>
                            {item.previousOfficerIds.length
                              ? item.previousOfficerIds
                                  .map((id) => officerMap.get(id) || id)
                                  .join(", ")
                              : "-"}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">Next:</p>
                          <p>
                            {item.nextOfficerIds.length
                              ? item.nextOfficerIds
                                  .map((id) => officerMap.get(id) || id)
                                  .join(", ")
                              : "-"}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {item.activeIncidentIds.length
                            ? item.activeIncidentIds
                                .map((id) => incidentMap.get(id) || id)
                                .join(", ")
                            : "-"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${handoverStatusClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                          {item.confirmedAt ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {new Date(item.confirmedAt).toLocaleString("id-ID")}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          {item.status !== "CONFIRMED" ? (
                            <form action={confirmHandoverShift}>
                              <input type="hidden" name="handoverId" value={item.id} />
                              <button
                                type="submit"
                                className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                Konfirmasi
                              </button>
                            </form>
                          ) : (
                            <span className="text-xs text-slate-500">Sudah dikonfirmasi</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        ) : null}
      </div>
    </main>
  );
}
