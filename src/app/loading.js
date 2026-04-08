export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 animate-pulse">
      {/* Page header skeleton */}
      <div className="pt-4 pb-2">
        <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
        <div className="h-6 w-64 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
        <div className="h-4 w-80 rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
          >
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
            <div className="h-8 w-12 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
            <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Large block */}
        <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Side block */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
