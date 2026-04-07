"use client";

import dynamic from "next/dynamic";

const MapTangsel = dynamic(() => import("@/components/map-tangsel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center rounded-2xl border border-border bg-muted text-sm text-muted-foreground">
      Memuat peta operasional…
    </div>
  ),
});

export default function OperationalMap() {
  return (
    <div className="h-[520px] w-full overflow-hidden rounded-2xl border border-border">
      <MapTangsel />
    </div>
  );
}
