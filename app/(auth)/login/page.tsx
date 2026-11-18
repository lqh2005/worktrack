"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { apiClient, ClientApiError } from "@/lib/api/client";
import { DEMO_USER } from "@/lib/demo/constants";
import { DemoLoginButton } from "@/components/auth/demo-login-button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.auth.login({ email, password });
      toast.success(`Welcome back, ${res.data.user.name}!`);
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof ClientApiError ? err.message : "Failed to sign in";
      setError(msg);
      setSubmitting(false);
    }
  }

  function fillDemoCredentials() {
    setEmail(DEMO_USER.email);
    setPassword(DEMO_USER.password);
    setError(null);
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/90 via-white to-indigo-50/80 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
            Demo Mode
          </span>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
          >
            Fill demo email &amp; password
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          Want to try the app right away? Log in with the demo account to explore sample projects,
          issues and sprint charts.
        </p>
        <DemoLoginButton
          redirectTo={redirectTo}
          label="Login as Demo User"
          className="mt-3.5 w-full"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-500">
            Create one
          </Link>
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Email
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hunglq@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Password
            </label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link href="/" className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-md shadow-brand-600/25">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900">WorkTrack</span>
      </Link>

      <Suspense
        fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-slate-200" />}
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
