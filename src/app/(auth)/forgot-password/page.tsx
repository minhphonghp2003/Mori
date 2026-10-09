"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { forgotPassword } from "@/services/auth";
import {
  AuthBackLink,
  AuthError,
  AuthInput,
  AuthLabel,
  AuthSubmitButton,
  authErrorText,
} from "@/components/auth/auth-form";

const RESEND_COOLDOWN_S = 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // API doc §17: forgot/reset are limited to 5/min/IP — keep the resend
  // button off for a full window after every attempt.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setIsLoading(true);
    setError(null);

    try {
      await forgotPassword(email);
      setSent(true);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(authErrorText(err, "Gửi yêu cầu thất bại. Vui lòng thử lại."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 flex flex-col">
      <AuthBackLink href="/login">Quay lại đăng nhập</AuthBackLink>

      <div className="mb-9">
        <h1 className="text-3xl font-extrabold tracking-tight text-balance text-slate-900 dark:text-slate-100">Quên mật khẩu</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
          Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu.
        </p>
      </div>

      {sent ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center pb-16">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center mb-5 ring-1 ring-emerald-600/20 shadow-lg shadow-emerald-600/10">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Đã gửi email</h2>

          <p className="mt-2 max-w-[280px] text-sm text-slate-500 dark:text-slate-400 font-medium">
            Kiểm tra hộp thư của bạn để nhận link đặt lại mật khẩu.
          </p>

          <button
            type="button"
            disabled={cooldown > 0}
            onClick={() => {
              setSent(false);
              setError(null);
            }}
            className="mt-7 px-5 py-3 min-h-[44px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
          >
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại email"}
          </button>

          <Link
            href="/login"
            className="mt-6 rounded text-sm font-bold text-emerald-600 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="space-y-5">
            <div>
              <AuthLabel htmlFor="forgot-email">Email</AuthLabel>
              <AuthInput
                id="forgot-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <AuthError message={error} />}
          </div>

          <div className="mt-auto pt-9 pb-[env(safe-area-inset-bottom)]">
            <AuthSubmitButton loading={isLoading} loadingText="Đang gửi...">
              Gửi link đặt lại
            </AuthSubmitButton>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
              Nhớ mật khẩu?{" "}
              <Link
                href="/login"
                className="font-bold text-emerald-600 hover:text-emerald-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              >
                Đăng nhập
              </Link>
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
