"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { LogOut, X } from "lucide-react"
import SignOutBtn from "@/components/sign-out-btn"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"

// Roles that can access management / data-master sections
const ADMIN_ROLES = new Set(["ADMIN", "KOORDINATOR_POSKO"])

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
      { href: "/manajemen/sdm", label: "Manajemen SDM" },
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
      { href: "/pengaturan", label: "Pengaturan" },
    ],
  },
]

function isLinkActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({
  userRole,
  profilePicture,
  ...props
}) {
  const pathname = usePathname()
  const { user } = useUser()
  const isAdmin = ADMIN_ROLES.has(userRole)
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between">
              <SidebarMenuButton size="lg" render={<a href="#" />}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <img
                    src="/images/logo pmi-tangsel.png"
                    alt="PMI Logo"
                    className="size-4"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="font-medium text-sidebar-foreground">Emergency Response Hub</span>
                  <span className="text-xs text-sidebar-foreground">PMI Kota Tangerang Selatan</span>
                </div>
              </SidebarMenuButton>
              {isMobile && (
                <button
                  onClick={() => setOpenMobile(false)}
                  className="mr-2 rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close sidebar</span>
                </button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      {/* Profile section at the top - adopting template structure */}
      <div className="px-4 py-5">
        <div className="flex flex-col items-center mb-4">
          <img
            src={profilePicture || "/images/default-profile-picture.png"}
            alt={user?.fullName || "User profile"}
            className="h-20 w-20 rounded-full border-2 border-red-500/40 object-cover mb-3 shadow-lg"
          />
          <div className="text-center">
            <p className="text-xs font-semibold text-muted-foreground">
              {isAdmin ? "Admin Panel" : "Panel Petugas"}
            </p>
            <h3 className="text-sm font-bold text-sidebar-foreground">
              Selamat Bertugas, {user?.fullName || "Petugas"}
            </h3>
          </div>
        </div>
      </div>

      <SidebarContent>
        {NAV_SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.links.map((link) => {
                  const active = isLinkActive(pathname, link.href)
                  return (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        render={<Link href={link.href} />}
                        isActive={active}
                        size="lg"
                      >
                        {link.label}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter>
        <div className="p-3">
          <SignOutBtn className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" />
            Keluar
          </SignOutBtn>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
