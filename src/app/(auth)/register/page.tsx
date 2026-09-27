"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRegister } from "@/hooks/auth";
import { syncFcmTokenAfterAuth } from "@/lib/fcm";
import {
  AuthBackLink,
  AuthError,
  AuthInput,
  AuthLabel,
  AuthSubmitButton,
  authErrorText,
} from "@/components/auth/auth-form";

const selectClasses =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition cursor-pointer appearance-none";

export default function RegisterPage() {
  const router = useRouter();
  const { mutate: register, isLoading } = useRegister();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    genderId: "1",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }

    setError(null);

    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        age: Number(form.age),
        genderId: Number(form.genderId),
      });
      void syncFcmTokenAfterAuth();
      router.replace("/");
    } catch (err) {
      setError(authErrorText(err, "Tạo tài khoản thất bại. Vui lòng thử lại."));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 flex flex-col">
      <AuthBackLink href="/init">Quay lại</AuthBackLink>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Tạo tài khoản</h1>
        <p className="mt-3 text-sm text-slate-400 dark:text-slate-500 font-medium">
          Tham gia {process.env.NEXT_PUBLIC_APP_NAME ?? "Mori"} và bắt đầu khám phá bạn bè xung
          quanh bạn.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="space-y-5">
          <div>
            <AuthLabel>Tên</AuthLabel>
            <AuthInput
              placeholder="Tên của bạn"
              value={form.name}
              onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
              required
              minLength={2}
              maxLength={200}
            />
          </div>

          <div>
            <AuthLabel>Email</AuthLabel>
            <AuthInput
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((x) => ({ ...x, email: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <AuthLabel>Tuổi</AuthLabel>
              <AuthInput
                type="number"
                inputMode="numeric"
                placeholder="18"
                value={form.age}
                min={1}
                max={120}
                onChange={(e) => setForm((x) => ({ ...x, age: e.target.value }))}
                required
              />
            </div>

            <div>
              <AuthLabel>Giới tính</AuthLabel>
              <select
                className={selectClasses}
                value={form.genderId}
                onChange={(e) => setForm((x) => ({ ...x, genderId: e.target.value }))}
              >
                <option value="1">Nam</option>
                <option value="2">Nữ</option>
                <option value="3">Gay</option>
                <option value="4">Les</option>
              </select>
            </div>
          </div>

          <div>
            <AuthLabel>Mật khẩu</AuthLabel>
            <AuthInput
              type="password"
              autoComplete="new-password"
              placeholder="Ít nhất 8 ký tự"
              value={form.password}
              onChange={(e) => setForm((x) => ({ ...x, password: e.target.value }))}
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
              value={form.confirmPassword}
              onChange={(e) => setForm((x) => ({ ...x, confirmPassword: e.target.value }))}
              required
              minLength={8}
              maxLength={100}
            />
          </div>

          {error && <AuthError message={error} />}
        </div>

        <div className="mt-auto pt-8">
          <AuthSubmitButton loading={isLoading} loadingText="Đang tạo tài khoản...">
            Tạo tài khoản
          </AuthSubmitButton>

          <p className="mt-6 text-center text-sm text-slate-400 dark:text-slate-500 font-medium">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-700">
              Đăng nhập
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
