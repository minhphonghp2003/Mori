"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

/** Route-level crash fallback — renders instead of a blank screen. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] route error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center select-none">
      <div className="w-14 h-14 rounded-3xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 flex items-center justify-center mb-4">
        <TriangleAlert className="w-7 h-7" />
      </div>
      <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
        Đã xảy ra lỗi
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-xs break-words">
        {error.message || "Không tải được trang này."}
      </p>
      <button
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Thử lại</span>
      </button>
    </div>
  );
}
