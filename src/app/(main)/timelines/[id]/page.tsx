"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import type { Timeline } from "@/types";
import { getTimelineById, getTimelineMomentsAll } from "@/services/timeline";
import { buildTimelineView, type TimelineOwnerLookup } from "@/lib/timeline/mappers";
import { TimelineDetailView } from "@/components/timelines/TimelineDetailView";
import { LogoLoader } from "@/components/common/LogoLoader";

export default function TimelineDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { timelines, currentUser, friends } = useApp();
  const [fetched, setFetched] = useState<Timeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fromContext = timelines.find((t) => t.id === params.id);
  const timeline = fetched ?? fromContext;

  useEffect(() => {
    const numericId = Number(params.id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setIsLoading(false);
      return;
    }
    let alive = true;
    setIsLoading(true);
    (async () => {
      try {
        const res = await getTimelineById(numericId);
        if (!alive || !res.data) return;
        const momentDtos = await getTimelineMomentsAll(numericId);
        if (!alive) return;
        const lookup: TimelineOwnerLookup = {
          myId: currentUser.id,
          findUser: (id: string) => {
            if (id === currentUser.id) {
              return { name: currentUser.name, avatar: currentUser.avatar };
            }
            const f = friends.find((u) => u.id === id);
            return f ? { name: f.name, avatar: f.avatar } : undefined;
          },
        };
        setFetched(buildTimelineView(res.data, momentDtos, lookup));
      } catch (err) {
        console.error("[TimelineDetailPage] load failed:", err);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.id, currentUser.id, currentUser.name, currentUser.avatar, friends]);

  if (!timeline) {
    if (isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-50 gap-2">
          <LogoLoader size="sm" text={null} />
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-50 p-6 text-center">
        <div className="text-4xl mb-3" aria-hidden="true">•</div>
        <div className="text-sm font-bold text-slate-700">Không tìm thấy hành trình</div>
        <p className="text-xs text-slate-400 mt-1">Hành trình này có thể đã bị xóa.</p>
        <button
          onClick={() => router.replace("/settings")}
          className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md cursor-pointer"
        >
          Về cài đặt
        </button>
      </div>
    );
  }

  return <TimelineDetailView timeline={timeline} onBack={() => router.back()} />;
}
