export default function ComingSoon({ title, description }) {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Sprint In Progress
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-foreground">{title}</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">{description}</p>
      </div>
    </main>
  );
}
