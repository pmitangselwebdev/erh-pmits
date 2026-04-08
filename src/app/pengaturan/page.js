import { redirect } from "next/navigation";
import { getCurrentSessionProfile } from "@/lib/auth";
import { OFFICER_TYPES, SPECIALIZATIONS, SYSTEM_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { updateProfile, updateProfilePicture } from "./actions";
import { markAllNotificationsAsRead, markNotificationAsRead } from "./actions";
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const OFFICER_TYPE_LABELS = {
  [OFFICER_TYPES.PETUGAS_POSKO]: "Petugas Posko",
  [OFFICER_TYPES.PETUGAS_ASSESSMENT]: "Petugas Assesment",
  [OFFICER_TYPES.PETUGAS_AMBULANCE]: "Petugas Ambulance",
};

const ROLE_LABELS = {
  [SYSTEM_ROLES.ADMIN]: "Admin",
  [SYSTEM_ROLES.KOORDINATOR_POSKO]: "Koordinator Posko",
  [SYSTEM_ROLES.PETUGAS]: "Petugas Operasional",
};

export default async function PengaturanPage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) redirect("/auth/callback");

  const resolvedParams = await searchParams;
  const alert = String(resolvedParams?.alert || "").trim();
  const alertType = String(resolvedParams?.alertType || "error").trim();

  // Get user data with all fields
  const userData = await db.user.findUnique({
    where: { id: profile.id },
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
    },
  });

  if (!userData) redirect("/auth/callback");

  // Get notifications and audit logs
  const [recentAuditLogs, notifications, unreadCount] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        action: true,
        module: true,
        userName: true,
        details: true,
      },
    }),
    db.notification.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        message: true,
        category: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    }),
    db.notification.count({
      where: { userId: profile.id, isRead: false },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Pengaturan</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Pengaturan Akun & Sistem</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kelola profil akun, notifikasi, dan lihat aktivitas sistem.
          </p>
        </header>

        {alert ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              alertType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {alert}
          </div>
        ) : null}

        {/* Profile Settings Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Profil & Informasi Akun</h2>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <img
                src={userData.profilePicture || "/images/default-profile-picture.png"}
                alt="Foto Profil"
                className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
              />
              <form action={updateProfilePicture} className="mt-3">
                <label
                  htmlFor="profilePicture"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Ubah Foto
                </label>
                <input
                  id="profilePicture"
                  name="profilePicture"
                  type="file"
                  accept="image/*"
                  required
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
                <button
                  type="submit"
                  className="mt-2 rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 active:bg-red-800"
                >
                  Simpan
                </button>
              </form>
            </div>
            
            {/* Account Info Display */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Informasi Akun</h3>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Nama Lengkap</dt>
                  <dd className="font-medium text-slate-900 truncate ml-2">{userData.fullName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-900 truncate ml-2">{userData.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Telepon</dt>
                  <dd className="font-medium text-slate-900 truncate ml-2">{userData.phoneNumber || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Gol. Darah</dt>
                  <dd className="font-medium text-slate-900">{userData.bloodType || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium text-slate-900">{userData.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Role</dt>
                  <dd className="font-medium text-slate-900">
                    {ROLE_LABELS[userData.role] ?? userData.role}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Spesialisasi</dt>
                  <dd className="font-medium text-slate-900">
                    {userData.specialization || "—"}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-400">
                Email, role, dan spesialisasi hanya dapat diubah oleh Administrator.
              </p>
            </div>
          </div>

          {/* Edit Profile Form */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Edit Profil</h3>
            <form action={updateProfile} className="space-y-4">
              <Field>
                <FieldLabel>Nama Lengkap <span className="text-red-600">*</span></FieldLabel>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  defaultValue={userData.fullName}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Nomor Telepon</FieldLabel>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    defaultValue={userData.phoneNumber ?? ""}
                    placeholder="Contoh: 08123456789"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </Field>

                <Field>
                  <FieldLabel>Golongan Darah</FieldLabel>
                  <select
                    id="bloodType"
                    name="bloodType"
                    defaultValue={userData.bloodType ?? ""}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="">— Pilih Golongan Darah —</option>
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field>
                <FieldLabel>Alamat</FieldLabel>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  defaultValue={userData.address ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </Field>

              <Field>
                <FieldLabel>Spesialisasi</FieldLabel>
                <select
                  id="specialization"
                  name="specialization"
                  defaultValue={userData.specialization ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="">— Pilih Spesialisasi —</option>
                  {Object.entries(SPECIALIZATIONS).map(([key, value]) => (
                    <option key={value} value={value}>
                      {key}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="pt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 active:bg-red-800"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Notifikasi Saya</h2>
              <p className="mt-1 text-xs text-slate-500">
                Menampilkan 50 notifikasi terbaru. Belum dibaca: {unreadCount}
              </p>
            </div>
            <form action={markAllNotificationsAsRead}>
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                Tandai Semua Dibaca
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2.5 font-semibold">Waktu</th>
                  <th className="px-3 py-2.5 font-semibold">Kategori</th>
                  <th className="px-3 py-2.5 font-semibold">Judul</th>
                  <th className="px-3 py-2.5 font-semibold">Pesan</th>
                  <th className="px-3 py-2.5 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Belum ada notifikasi.
                    </td>
                  </tr>
                ) : null}

                {notifications.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 last:border-b-0 ${
                      item.isRead ? "bg-white" : "bg-sky-50/50"
                    }`}
                  >
                    <td className="px-3 py-2.5 text-slate-700">
                      <p>{new Date(item.createdAt).toLocaleString("id-ID")}</p>
                      {item.readAt ? (
                        <p className="text-xs text-slate-500">
                          Dibaca: {new Date(item.readAt).toLocaleString("id-ID")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{item.category}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-900">{item.title}</td>
                    <td className="px-3 py-2.5 text-slate-700">{item.message}</td>
                    <td className="px-3 py-2.5">
                      {item.isRead ? (
                        <span className="text-xs text-slate-500">Sudah dibaca</span>
                      ) : (
                        <form action={markNotificationAsRead}>
                          <input type="hidden" name="notificationId" value={item.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-slate-700 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-600 transition-colors"
                          >
                            Tandai Dibaca
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit Log Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Audit Log Terbaru</h2>
          <p className="text-xs text-slate-500 mb-4">Menampilkan 50 aktivitas terakhir.</p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2.5 font-semibold">Waktu</th>
                  <th className="px-3 py-2.5 font-semibold">User</th>
                  <th className="px-3 py-2.5 font-semibold">Modul</th>
                  <th className="px-3 py-2.5 font-semibold">Aksi</th>
                  <th className="px-3 py-2.5 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {recentAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Belum ada audit log.
                    </td>
                  </tr>
                ) : null}

                {recentAuditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-2.5 text-slate-700">
                      {new Date(log.createdAt).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{log.userName || "-"}</td>
                    <td className="px-3 py-2.5 text-slate-700">{log.module}</td>
                    <td className="px-3 py-2.5 text-slate-700">{log.action}</td>
                    <td className="px-3 py-2.5 text-slate-600">
                      <pre className="max-w-[440px] overflow-x-auto whitespace-pre-wrap text-xs">
                        {log.details}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}