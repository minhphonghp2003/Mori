"use client";

import { WifiOff, RefreshCw } from "lucide-react";

/** Fallback rendered by the service worker when navigation fails offline. */
export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center select-none">
      <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-lg">
        <WifiOff className="w-8 h-8" />
      </div>
      <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Bạn đang ngoại tuyến</h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-xs">
        Không thể tải trang vì mất kết nối mạng. Các thay đổi bạn thực hiện
        khi offline sẽ được đồng bộ khi có mạng trở lại.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Thử lại</span>
      </button>
    </div>
  );
}
