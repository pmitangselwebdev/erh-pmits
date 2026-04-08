export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 animate-pulse">
      {/* Header */}
      <div className="pt-4 pb-2">
        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
        <div className="h-7 w-52 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
        <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-8 w-10 rounded bg-slate-200 dark:bg-slate-700 mb-1" />
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>

      {/* Map + sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Map placeholder */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden" style={{ minHeight: 360 }}>
          <div className="h-full w-full bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>

        {/* Activity list */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
