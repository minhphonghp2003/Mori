"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { syncFcmTokenAfterAuth } from "@/lib/fcm";
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  REFRESH_TOKEN_EXPIRES_AT_KEY,
  USER_ID_KEY,
  USER_INFO_KEY,
} from "@/constants";
import { env } from "@/config/env";

/** Decode a JWT payload (base64url-safe). */
function decodeJwt(token: string): { sub?: string; name?: string; email?: string } | null {
  try {
    const base64 = token
      .split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const { login } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");
    const expiresAt = params.get("expiresAt");
    const refreshTokenExpiresAt = params.get("refreshTokenExpiresAt");
    const error = params.get("error");

    if (error || !token) {
      router.replace(error ? `/init?error=${encodeURIComponent(error)}` : "/init");
      return;
    }

    const payload = decodeJwt(token);
    if (!payload?.sub) {
      router.replace("/init");
      return;
    }

    const user = {
      id: Number(payload.sub),
      name: payload.name ?? "",
      email: payload.email ?? "",
    };

    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (expiresAt) localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
    if (refreshTokenExpiresAt) localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, refreshTokenExpiresAt);
    localStorage.setItem(USER_ID_KEY, String(user.id));
    localStorage.setItem(USER_INFO_KEY, JSON.stringify({ name: user.name, email: user.email }));

    login(
      user,
      token,
      refreshToken ?? undefined,
      expiresAt ?? undefined,
      refreshTokenExpiresAt ?? undefined,
    );

    // OAuth login doesn't carry an fcmToken — register the device token via
    // PUT /fcm-token (prompts for notification permission if needed).
    void syncFcmTokenAfterAuth();

    router.replace("/");
  }, [router, login]);

  return (
    <main className="min-h-dvh w-full bg-slate-50 flex flex-col items-center justify-center gap-5 px-6">
      <div className="p-1.5 bg-white rounded-[28px] shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/70">
        <Image
          src="/images/logo.webp"
          alt={env.NEXT_PUBLIC_APP_NAME}
          width={80}
          height={80}
          priority
          className="rounded-[22px]"
        />
      </div>
      <div className="flex items-center gap-2.5 text-sm font-bold text-slate-400">
        <span className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        Đang đăng nhập...
      </div>
    </main>
  );
}
