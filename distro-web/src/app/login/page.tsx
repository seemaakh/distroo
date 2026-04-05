"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockMinutes, setLockMinutes] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLockMinutes(null);

    try {
      const res = await api.post("/auth/login", { phone, password });
      const user = res.data.user ?? res.data.profile;
      setAuth(res.data.token, user);

      const redirect = searchParams.get("redirect");
      if (user.role === "ADMIN") {
        router.push(redirect || "/admin");
      } else {
        router.push(redirect || "/orders");
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; minutesLeft?: number; code?: string } } })
        ?.response?.data;

      const isNetworkError = !(err as { response?: unknown })?.response;
      if (isNetworkError) {
        setError("Cannot reach the server. Make sure the API is running.");
      } else if (data?.code === "ACCOUNT_SUSPENDED") {
        setError("Your account has been suspended. Contact support on WhatsApp.");
      } else if (data?.code === "ACCOUNT_LOCKED" || data?.minutesLeft) {
        setLockMinutes(data?.minutesLeft ?? 5);
        setError(null);
      } else {
        setError(data?.message || "Incorrect phone number or password.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-grotesk font-bold text-3xl text-blue">
            DISTRO
          </Link>
          <p className="text-gray-400 text-sm mt-2">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="98XXXXXXXX"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-blue"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error states */}
          {error && (
            <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {lockMinutes !== null && (
            <div className="flex items-start gap-2 text-amber-600 bg-amber-50 rounded-xl p-3 text-sm">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              Account temporarily locked. Try again in{" "}
              <span className="font-semibold">{lockMinutes} minute{lockMinutes !== 1 ? "s" : ""}</span>.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue hover:bg-blue-dark disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-5">
          New to DISTRO?{" "}
          <Link href="/register" className="text-blue font-medium hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}
