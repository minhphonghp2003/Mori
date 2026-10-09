"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLogin } from "@/hooks/auth";
import { syncFcmTokenAfterAuth } from "@/lib/fcm";
import {
  AuthBackLink,
  AuthError,
  AuthInput,
  AuthLabel,
  AuthSubmitButton,
  authErrorText,
} from "@/components/auth/auth-form";

export default function LoginPage() {
  const router = useRouter();
  const { mutate: login, isLoading } = useLogin();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(form);
      // Obtain the FCM token (prompts for permission if needed) and register
      // it via PUT /fcm-token — best-effort, never blocks the redirect.
      void syncFcmTokenAfterAuth();
      router.replace("/");
    } catch (err) {
      setError(authErrorText(err, "Đăng nhập thất bại. Vui lòng thử lại."));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 flex flex-col">
      <AuthBackLink href="/init">Quay lại</AuthBackLink>

      <div className="mb-9">
        <h1 className="text-3xl font-extrabold tracking-tight text-balance text-slate-900 dark:text-slate-100">
          Chào mừng trở lại
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
          Đăng nhập để tiếp tục trò chuyện và xem bạn bè ở đâu.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="space-y-5">
          <div>
            <AuthLabel htmlFor="login-email">Email</AuthLabel>
            <AuthInput
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((x) => ({ ...x, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <AuthLabel htmlFor="login-password">Mật khẩu</AuthLabel>
              <Link
                href="/forgot-password"
                className="rounded text-xs font-bold text-emerald-600 hover:text-emerald-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <AuthInput
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Mật khẩu"
              value={form.password}
              onChange={(e) => setForm((x) => ({ ...x, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>

          {error && <AuthError message={error} />}
        </div>

        <div className="mt-auto pt-9 pb-[env(safe-area-inset-bottom)]">
          <AuthSubmitButton loading={isLoading} loadingText="Đang đăng nhập...">
            Đăng nhập
          </AuthSubmitButton>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="font-bold text-emerald-600 hover:text-emerald-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              Tạo tài khoản
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
