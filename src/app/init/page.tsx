"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useApp } from "@/context/AppContext";
import { env } from "@/config/env";

type OAuthProvider = "google" | "facebook";

const ERROR_MESSAGES: Record<string, string> = {
  facebook_email_not_shared:
    "Facebook không chia sẻ địa chỉ email. Vui lòng sử dụng Google hoặc đăng nhập bằng email.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073C24 5.446 18.627.073 12 .073S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default function InitPage() {
  const router = useRouter();
  const { isAuthenticated, hydrated } = useAuth();
  const { showToast } = useApp();

  // Already signed in (e.g. opened /init directly) → back to the app.
  useEffect(() => {
    if (hydrated && isAuthenticated) router.replace("/");
  }, [hydrated, isAuthenticated, router]);

  // OAuth flows redirect back with ?error=... (API doc §2).
  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (!error) return;
    showToast(ERROR_MESSAGES[error] ?? "Đăng nhập thất bại. Vui lòng thử lại.", "error");
    window.history.replaceState(null, "", "/init");
  }, [showToast]);

  const handleOAuth = (provider: OAuthProvider) => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    window.location.href = `${env.NEXT_PUBLIC_API_URL}/auth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  return (
    <main className="min-h-dvh w-full bg-slate-50 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="p-1.5 bg-white rounded-[28px] shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/70">
          <Image
            src="/images/logo.webp"
            alt={env.NEXT_PUBLIC_APP_NAME}
            width={104}
            height={104}
            priority
            className="rounded-[22px]"
          />
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
          {env.NEXT_PUBLIC_APP_NAME}
        </h1>
        <p className="mt-2 text-center text-sm font-medium text-slate-400">
          Gần nhau hơn. Gặp gỡ xung quanh. Trò chuyện ngay.
        </p>

        <div className="mt-9 w-full space-y-3">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="w-full h-12 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center justify-center gap-3 shadow-sm transition cursor-pointer active:scale-[0.98]"
          >
            <GoogleIcon />
            Tiếp tục với Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuth("facebook")}
            className="w-full h-12 rounded-2xl bg-[#1877F2] hover:bg-[#1877F2]/90 text-white text-sm font-bold flex items-center justify-center gap-3 shadow-md shadow-[#1877F2]/25 transition cursor-pointer active:scale-[0.98]"
          >
            <FacebookIcon />
            Tiếp tục với Facebook
          </button>

          <div className="flex items-center gap-3 py-2">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              hoặc
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <Link href="/login" className="block">
            <button
              type="button"
              className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/25 transition cursor-pointer active:scale-[0.98]"
            >
              <LogIn className="w-4.5 h-4.5" />
              Đăng nhập bằng email
            </button>
          </Link>

          <p className="pt-2 text-center text-sm font-medium text-slate-400">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-700">
              Đăng ký
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
