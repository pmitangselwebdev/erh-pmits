"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import NotificationBar from "@/components/notification-bar";
import ChatWidget from "@/components/chat-widget";
import { AppSidebar } from "@/components/app-sidebar";
import { RealtimeProvider } from "@/components/realtime-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

// Roles that can access management / data-master sections
const ADMIN_ROLES = new Set(["ADMIN", "KOORDINATOR_POSKO"]);

const APP_ROUTES = [
  "/dashboard",
  "/operasional",
  "/manajemen",
  "/data-master",
  "/laporan",
  "/pengaturan",
];

const NAV_SECTIONS = [
  {
    title: "Utama",
    links: [
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Petugas",
    links: [
      { href: "/operasional/petugas-posko/kejadian", label: "Petugas Posko" },
      { href: "/operasional/petugas-ambulance/permintaan", label: "Petugas Ambulance" },
      { href: "/operasional/petugas-assessment/assessment", label: "Petugas Assesment" },
      { href: "/operasional/event-medis", label: "Event Medis" },
    ],
  },
  {
    title: "Manajemen",
    adminOnly: true,
    links: [
      { href: "/manajemen/sdm/approval", label: "Manajemen SDM" },
      { href: "/manajemen/sdm/shift", label: "Shift Petugas" },
      { href: "/manajemen/sdm/handover", label: "Handover" },
      { href: "/manajemen/logistik", label: "Logistik" },
    ],
  },
  {
    title: "Data & Laporan",
    adminOnly: true,
    links: [
      { href: "/data-master/ambulance-unit", label: "Unit Ambulance" },
      { href: "/data-master/motor-unit", label: "Armada Motor" },
      { href: "/data-master/rumah-sakit", label: "Rumah Sakit" },
      { href: "/data-master/kontak-darurat", label: "Kontak Darurat" },
      { href: "/laporan", label: "Laporan" },
    ],
  },
  {
    title: "Akun",
    links: [
      { href: "/pengaturan/profil", label: "Setting Profile" },
      { href: "/pengaturan", label: "Notifikasi & Log" },
    ],
  },
];

function isInternalAppRoute(pathname) {
  return APP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isLinkActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children, userRole }) {
  const pathname = usePathname();
  const shouldUseShell = isInternalAppRoute(pathname);
  const { user } = useUser(); // Get user info from Clerk
  const [profilePicture, setProfilePicture] = useState(null);

  useEffect(() => {
    if (!shouldUseShell) return;

    async function fetchProfilePicture() {
      try {
        const response = await fetch("/api/user/profile-picture");
        if (response.ok) {
          const data = await response.json();
          setProfilePicture(data.profilePicture);
        }
      } catch (error) {
        console.error("Error fetching profile picture:", error);
      }
    }
    fetchProfilePicture();
  }, [shouldUseShell]);

  if (!shouldUseShell) {
    return children;
  }

  const isAdmin = ADMIN_ROLES.has(userRole);

  return (
    <RealtimeProvider>
      <SidebarProvider>
        <AppSidebar 
          userRole={userRole}
          profilePicture={profilePicture}
        />
        <main className="flex-1 min-w-0">
          {/* Mobile header with sidebar trigger */}
          <header className="sticky top-0 z-30 bg-slate-900 p-3 lg:hidden">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="text-slate-100 hover:text-white" />
              <h1 className="text-center text-sm font-bold leading-tight text-white">Emergency Response Hub PMI Kota Tangerang Selatan</h1>
              <div className="w-6"></div> {/* Spacer for alignment */}
            </div>
          </header>

          {/* Top notification bar */}
          <div className="relative z-40 overflow-visible border-b border-slate-200 bg-white dark:bg-card dark:border-slate-700 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-600 dark:text-slate-300">Sistem aktif • {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
              <div className="relative z-50 flex items-center gap-2 overflow-visible">
                <ThemeToggle />
                <ChatWidget />
                <NotificationBar />
              </div>
            </div>
          </div>
          
          {/* Page content */}
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </RealtimeProvider>
  );
}
