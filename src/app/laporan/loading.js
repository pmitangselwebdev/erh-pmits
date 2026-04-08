export default function LaporanLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 animate-pulse">
      <div className="pt-4 pb-2">
        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
        <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
        <div className="h-4 w-64 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700/50">
              <div className="flex gap-3 items-center">
                <div className="h-8 w-8 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-1.5">
                  <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
              <div className="h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
