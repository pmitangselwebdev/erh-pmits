"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function SignOutBtn({ className, children }) {
  return (
    <SignOutButton redirectUrl="/sign-in">
      <button
        type="button"
        className={className ?? "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"}
      >
        {children ?? "Keluar"}
      </button>
    </SignOutButton>
  );
}
