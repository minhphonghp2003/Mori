"use client";

import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { useSwUpdate } from "@/hooks/use-sw-update";

/** Banner shown when a newly deployed service worker is waiting. */
export const SwUpdateBanner = () => {
  const { updateReady, applyUpdate, dismiss } = useSwUpdate();

  // The new worker takes over → reload once into the fresh app.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);

  if (!updateReady) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[95] flex justify-center px-4 pt-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-full bg-emerald-600 text-white shadow-lg text-[11px] font-bold">
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap">Có bản mới, cập nhật ngay?</span>
        <button
          onClick={applyUpdate}
          className="px-3 py-1 rounded-full bg-white text-emerald-700 text-[11px] font-bold hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          Cập nhật
        </button>
        <button
          onClick={dismiss}
          className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center cursor-pointer"
          title="Để sau"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
