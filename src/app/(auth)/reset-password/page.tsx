"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Link2Off } from "lucide-react";
import { resetPassword } from "@/services/auth";
import {
  AuthBackLink,
  AuthError,
  AuthInput,
  AuthLabel,
  AuthSubmitButton,
  authErrorText,
} from "@/components/auth/auth-form";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => router.replace("/login"), 2000);
    return () => clearTimeout(timer);
  }, [success, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(authErrorText(err, "Đặt lại mật khẩu thất bại. Vui lòng thử lại."));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 flex flex-col">
        <AuthBackLink href="/forgot-password">Quay lại</AuthBackLink>

        <div className="flex flex-1 flex-col items-center justify-center text-center pb-16">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-5 ring-8 ring-rose-500/10">
            <Link2Off className="w-8 h-8 text-rose-500" />
          </div>

          <h2 className="text-lg font-extrabold text-slate-900">Liên kết không hợp lệ</h2>

          <p className="mt-2 max-w-[280px] text-sm text-slate-400 font-medium">
            Liên kết đặt lại mật khẩu bị thiếu hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.
          </p>

          <Link
            href="/forgot-password"
            className="mt-7 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all"
          >
            Yêu cầu link mới
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-5 ring-8 ring-emerald-500/10">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>

        <h2 className="text-lg font-extrabold text-slate-900">
          Đặt lại mật khẩu thành công
        </h2>

        <p className="mt-2 text-sm text-slate-400 font-medium">
          Đang chuyển hướng đến trang đăng nhập...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 flex flex-col">
      <AuthBackLink href="/login">Quay lại đăng nhập</AuthBackLink>

      <div className="mb-9">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Đặt lại mật khẩu
        </h1>
        <p className="mt-3 text-sm text-slate-400 font-medium">
          Nhập mật khẩu mới cho tài khoản của bạn.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="space-y-5">
          <div>
            <AuthLabel>Mật khẩu mới</AuthLabel>
            <AuthInput
              type="password"
              autoComplete="new-password"
              placeholder="Ít nhất 8 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={100}
            />
          </div>

          <div>
            <AuthLabel>Xác nhận mật khẩu</AuthLabel>
            <AuthInput
              type="password"
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              maxLength={100}
            />
          </div>

          {error && <AuthError message={error} />}
        </div>

        <div className="mt-auto pt-9">
          <AuthSubmitButton loading={isLoading} loadingText="Đang đặt lại...">
            Đặt lại mật khẩu
          </AuthSubmitButton>

          <p className="mt-6 text-center text-sm text-slate-400 font-medium">
            <Link
              href="/forgot-password"
              className="font-bold text-indigo-600 hover:text-indigo-700"
            >
              Yêu cầu link mới
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
