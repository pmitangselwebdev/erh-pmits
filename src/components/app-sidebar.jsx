"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import {
  LayoutDashboard,
  Building2,
  Truck,
  ClipboardList,
  HeartPulse,
  Users,
  Package,
  Car,
  Building,
  PhoneCall,
  FileBarChart2,
  Settings,
  LogOut,
  ChevronUp,
  ShieldCheck,
  UserRound,
} from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const ADMIN_ROLES = new Set(["ADMIN", "KOORDINATOR_POSKO"])

const NAV_SECTIONS = [
  {
    title: "Utama",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operasional",
    links: [
      { href: "/operasional/petugas-posko/kejadian", label: "Petugas Posko", icon: Building2 },
      { href: "/operasional/petugas-ambulance/permintaan", label: "Petugas Ambulance", icon: Truck },
      { href: "/operasional/petugas-assessment/assessment", label: "Petugas Assessment", icon: ClipboardList },
      { href: "/operasional/event-medis", label: "Event Medis", icon: HeartPulse },
    ],
  },
  {
    title: "Manajemen",
    adminOnly: true,
    links: [
      { href: "/manajemen/sdm", label: "Sumber Daya Manusia", icon: Users },
      { href: "/manajemen/logistik", label: "Logistik", icon: Package },
    ],
  },
  {
    title: "Data & Laporan",
    adminOnly: true,
    links: [
      { href: "/data-master/ambulance-unit", label: "Unit Ambulance", icon: Truck },
      { href: "/data-master/motor-unit", label: "Armada Motor", icon: Car },
      { href: "/data-master/rumah-sakit", label: "Rumah Sakit", icon: Building },
      { href: "/data-master/kontak-darurat", label: "Kontak Darurat", icon: PhoneCall },
      { href: "/laporan", label: "Laporan", icon: FileBarChart2 },
    ],
  },
]

function isLinkActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({ userRole, profilePicture, ...props }) {
  const pathname = usePathname()
  const { user } = useUser()
  const isAdmin = ADMIN_ROLES.has(userRole)
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const roleLabel =
    userRole === "ADMIN" ? "Administrator" :
    userRole === "KOORDINATOR_POSKO" ? "Koordinator" :
    "Petugas"

  const RoleIcon = userRole === "ADMIN" || userRole === "KOORDINATOR_POSKO"
    ? ShieldCheck
    : UserRound

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* ── Brand Header ── */}
      <SidebarHeader className="border-b border-sidebar-border/50 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Emergency Response Hub"
              render={<Link href="/dashboard" />}
              className="hover:bg-sidebar-accent/60"
            >
              <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-md shadow-red-900/40 shrink-0">
                <img
                  src="/images/logo pmi-tangsel.png"
                  alt="PMI"
                  className="size-5 brightness-0 invert"
                />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-[13px] font-bold tracking-tight text-sidebar-foreground">
                  ERS PMI Tangsel
                </span>
                <span className="truncate text-[11px] text-sidebar-foreground/40">
                  Emergency Response Hub
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="py-2">
        {NAV_SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((section) => (
          <SidebarGroup key={section.title} className="px-2 py-0">
            <SidebarGroupLabel className="h-7 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {section.links.map((link) => {
                  const active = isLinkActive(pathname, link.href)
                  const Icon = link.icon
                  return (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        render={<Link href={link.href} />}
                        isActive={active}
                        tooltip={link.label}
                        className={
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 font-medium"
                        }
                      >
                        <Icon
                          className={`size-4 shrink-0 ${active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/50"}`}
                        />
                        <span className="truncate">{link.label}</span>
                        {active && (
                          <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary-foreground/70 shrink-0 group-data-[collapsible=icon]:hidden" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── User Footer ── */}
      <SidebarFooter className="border-t border-sidebar-border/50 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    tooltip={user?.fullName || "Akun"}
                    className="hover:bg-sidebar-accent/60 data-[state=open]:bg-sidebar-accent/80"
                  />
                }
              >
                <div className="relative shrink-0">
                  <img
                    src={profilePicture || "/images/default-profile-picture.png"}
                    alt={user?.fullName || "User"}
                    className="size-8 rounded-full object-cover ring-2 ring-sidebar-border"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-sidebar-foreground text-[13px]">
                    {user?.fullName || "Petugas"}
                  </span>
                  <span className="flex items-center gap-1 truncate text-[11px] text-sidebar-foreground/40">
                    <RoleIcon className="size-3 shrink-0" />
                    {roleLabel}
                  </span>
                </div>
                <ChevronUp className="ml-auto size-4 shrink-0 text-sidebar-foreground/30" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={8}
                className="w-56 rounded-xl border border-border/60 bg-popover shadow-xl"
              >
                {/* User info header */}
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <img
                    src={profilePicture || "/images/default-profile-picture.png"}
                    alt={user?.fullName || "User"}
                    className="size-9 rounded-full object-cover ring-2 ring-border"
                  />
                  <div className="grid flex-1 leading-tight">
                    <span className="truncate text-sm font-semibold">{user?.fullName || "Petugas"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || ""}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={<Link href="/pengaturan" className="flex items-center gap-2" />}
                >
                  <Settings className="size-4 text-muted-foreground" />
                  <span>Pengaturan Akun</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/30 dark:focus:text-red-400">
                  <SignOutBtn className="flex w-full items-center gap-2 text-inherit bg-transparent p-0 border-0 font-normal text-sm cursor-default">
                    <LogOut className="size-4" />
                    Keluar
                  </SignOutBtn>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
