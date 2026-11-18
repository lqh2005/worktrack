"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiClient, ClientApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface DemoLoginButtonProps {
  className?: string;
  label?: string;
  redirectTo?: string;
  variant?: "primary" | "outline";
}

export function DemoLoginButton({
  className,
  label = "Login as Demo User",
  redirectTo = "/dashboard",
  variant = "primary",
}: DemoLoginButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDemoLogin() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiClient.auth.loginDemo();
      toast.success(`Signed in as ${res.data.user.name}`);
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ClientApiError
          ? err.message
          : "Could not start demo session. Please check database connection.";
      toast.error(message);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDemoLogin}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20 hover:from-brand-500 hover:to-indigo-500"
          : "border border-brand-200 bg-brand-50/70 text-brand-700 hover:bg-brand-100/80",
        className,
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}
