export default function PengaturanLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 animate-pulse">
      <div className="pt-4 pb-2">
        <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
        <div className="h-6 w-44 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Profile card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        {/* Form */}
        <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 mb-1.5" />
                <div className="h-9 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
          <div className="mt-4 h-9 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}
