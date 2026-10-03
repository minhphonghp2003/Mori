import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { AxiosError } from "axios";
import { handleApiError } from "@/lib/axios";

/** Shared form building blocks for the auth screens (emerald/slate design). */

const inputClasses =
  "w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition disabled:opacity-60";

export const AuthLabel = ({ children }: { children: ReactNode }) => (
  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{children}</span>
);

export const AuthInput = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`${inputClasses} ${className ?? ""}`} />
);

interface AuthSubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  loadingText: string;
}

export const AuthSubmitButton = ({
  loading,
  loadingText,
  children,
  className,
  ...props
}: AuthSubmitButtonProps) => (
  <button
    type="submit"
    disabled={loading}
    className={`w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none ${className ?? ""}`}
    {...props}
  >
    {loading ? loadingText : children}
  </button>
);

export const AuthError = ({ message }: { message: string }) => (
  <div
    role="alert"
    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600"
  >
    {message}
  </div>
);

export const AuthBackLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <Link
    href={href}
    className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition mb-8"
  >
    <ArrowLeft className="w-4 h-4" />
    {children}
  </Link>
);

/** Map a caught API error to user-facing text (401 = wrong credentials on
 *  the login form; everything else per the API-doc §17 FE rule). */
export function authErrorText(err: unknown, fallback: string): string {
  const status = (err as AxiosError | undefined)?.response?.status;
  if (status === 401) return "Email hoặc mật khẩu không đúng.";
  return handleApiError(err as AxiosError).message || fallback;
}
