function TableSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
        <div className="h-3 w-64 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="p-4">
        {/* Table header */}
        <div className="grid grid-cols-4 gap-4 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-3 rounded bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        {/* Rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 py-2.5 border-b border-slate-50 dark:border-slate-700/50">
            {[...Array(4)].map((_, j) => (
              <div
                key={j}
                className="h-3 rounded bg-slate-200 dark:bg-slate-700"
                style={{ opacity: 1 - j * 0.15 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OperasionalLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 animate-pulse">
      <div className="pt-4 pb-2">
        <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
        <div className="h-6 w-56 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
        <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="flex gap-2 mb-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-9 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
