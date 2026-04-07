import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-red-50 p-6 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold tracking-wide text-red-700 dark:bg-red-500/20 dark:text-red-200">
            PMI Kota Tangerang Selatan
          </span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">Daftar Akun Baru</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Gunakan akun Google untuk mendaftar</p>
        </div>
        <SignUp
          forceRedirectUrl="/auth/callback"
          signInForceRedirectUrl="/auth/callback"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none border border-slate-200 rounded-2xl dark:border-slate-700 dark:bg-slate-900",
              headerTitle: "text-slate-900 dark:text-slate-100",
              headerSubtitle: "text-slate-600 dark:text-slate-300",
              socialButtonsBlockButton: "border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
              socialButtonsBlockButtonText: "text-slate-700 dark:text-slate-100",
              dividerLine: "bg-slate-200 dark:bg-slate-700",
              dividerText: "text-slate-500 dark:text-slate-400",
              formFieldLabel: "text-slate-700 dark:text-slate-200",
              formFieldInput: "border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
              formButtonPrimary: "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white",
              footerActionText: "text-slate-600 dark:text-slate-300",
              footerActionLink: "text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200",
            },
          }}
        />
      </div>
    </main>
  );
}
