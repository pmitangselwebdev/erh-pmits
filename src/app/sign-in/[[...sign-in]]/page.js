import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 via-white to-red-50 p-6 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-xl shadow-black/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-6 text-center">
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold tracking-wide text-red-700 dark:bg-red-500/20 dark:text-red-200">
            PMI Kota Tangerang Selatan
          </span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">SIM Posko Siaga 24 Jam</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Masuk dengan akun Google</p>
        </div>

        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl="/auth/callback"
          afterSignUpUrl="/auth/callback"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none border border-transparent rounded-2xl bg-transparent",
              headerTitle: "text-slate-900 dark:text-slate-100",
              headerSubtitle: "text-slate-600 dark:text-slate-300",
              socialButtonsBlockButton: "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-100",
              socialButtonsBlockButtonText: "text-slate-700 dark:text-slate-100",
              dividerLine: "bg-slate-200 dark:bg-slate-700",
              dividerText: "text-slate-500 dark:text-slate-400",
              formFieldLabel: "text-slate-700 dark:text-slate-200",
              formFieldInput: "border-slate-200 bg-white text-slate-900 focus:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
              formButtonPrimary: "bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600",
              footerActionText: "text-slate-600 dark:text-slate-300",
              footerActionLink: "text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200",
            },
          }}
        />
      </div>
    </main>
  );
}
