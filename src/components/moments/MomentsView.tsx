import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CreateMomentModal } from './CreateMomentModal';
import { MomentReelCard } from './MomentReelCard';
import { MomentViewerModal } from './MomentViewerModal';
import { Plus, Camera, Film, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { LogoLoader } from '../common/LogoLoader';
import type { Moment } from '../../types';
import { getMomentById } from '@/services/moment';
import { mapMoment } from '@/lib/moment/mappers';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';

export const MomentsView: React.FC = () => {
  const { 
    moments, 
    setIsNavHidden,
    isLoadingMoments,
    isLoadingMoreMoments,
    momentsHasMore,
    momentsError,
    refreshMoments,
    loadMoreMoments,
    processingMomentIds
  } = useApp();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [deepLinkMoment, setDeepLinkMoment] = useState<Moment | null>(null);
  const feedContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  // Tapping the active Khoảnh khắc tab scrolls the feed up.
  useScrollToTop(feedContainerRef);

  // Sync immersive state with global bottom navigation bar visibility
  useEffect(() => {
    setIsNavHidden(isImmersive);
  }, [isImmersive, setIsNavHidden]);

  // Share target: /moments?momentId=<id> opens the viewer for that moment.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('momentId');
    if (!id || !Number(id)) return;
    // Consume the param once so revisiting the tab doesn't reopen the viewer.
    window.history.replaceState(null, '', window.location.pathname);
    let alive = true;
    (async () => {
      try {
        const res = await getMomentById(Number(id));
        if (alive && res.data) setDeepLinkMoment(mapMoment(res.data));
      } catch {
        // 404 / not visible — axios already toasted.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Handle scroll detection: when scrolling down/up in feed, automatically hide nav bar for full immersion
  const handleScroll = () => {
    const el = feedContainerRef.current;
    if (!el) return;
    const currentScrollTop = el.scrollTop;
    const delta = currentScrollTop - lastScrollTopRef.current;

    // Scrolling down (moving to next moment) -> hide nav bar
    if (delta > 20 && currentScrollTop > 50) {
      setIsNavHidden(true);
    } 
    // Scrolled back to the very top -> restore nav bar
    else if (currentScrollTop <= 10) {
      if (!isImmersive) {
        setIsNavHidden(false);
      }
    }

    lastScrollTopRef.current = currentScrollTop;

    // Near the end of the snap feed → fetch the next cursor page.
    if (momentsHasMore && moments.length > 0 && el.clientHeight > 0) {
      const index = Math.round(currentScrollTop / el.clientHeight);
      if (moments.length - index <= 2) void loadMoreMoments();
    }
  };

  const toggleImmersive = () => {
    setIsImmersive(prev => !prev);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* Top Header Bar (Only Add Moment button on top right, no title text) */}
      <div 
        className={`absolute top-0 inset-x-0 z-30 px-4 py-3 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-end pointer-events-auto transition-all duration-300 ${
          isImmersive ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Right: Add Moment Action Button in Top Header */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25 text-white text-xs font-bold shadow-lg active:scale-95 transition-all cursor-pointer"
          title="Tạo khoảnh khắc mới (Ảnh & Video)"
        >
          <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Đăng</span>
          <Plus className="w-3.5 h-3.5 -ml-0.5 stroke-[3]" />
        </button>
      </div>

      {/* ERROR STATE (feed failed and nothing to show) */}
      {momentsError && moments.length === 0 && !isLoadingMoments && (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white bg-slate-950">
          <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold">Không tải được khoảnh khắc</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4 max-w-xs">
            Đã có lỗi xảy ra khi tải feed. Kiểm tra kết nối mạng và thử lại nhé.
          </p>
          <button
            onClick={() => void refreshMoments()}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-700 rounded-full text-xs font-bold text-white shadow-lg cursor-pointer whitespace-nowrap truncate flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* INITIAL LOADING */}
      {isLoadingMoments && moments.length === 0 && !momentsError && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-950 text-white">
          <LogoLoader size="md" text={null} />
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoadingMoments && !momentsError && moments.length === 0 && (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white bg-slate-950">
          <Film className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold whitespace-nowrap truncate">Chưa có khoảnh khắc nào</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4 max-w-xs">
            Hãy bấm nút Đăng ở góc trên để tạo ảnh hoặc video đầu tiên của bạn!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-700 rounded-full text-xs font-bold text-white shadow-lg cursor-pointer whitespace-nowrap truncate flex items-center gap-1.5"
          >
            <Camera className="w-4 h-4" />
            <span>Tạo khoảnh khắc ngay</span>
          </button>
        </div>
      )}

      {/* Main Reels / TikTok Vertical Snapping Feed */}
      {moments.length > 0 && (
        <div 
          ref={feedContainerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        >
          {moments.map((moment) => (
            <div 
              key={moment.id} 
              className="w-full h-full snap-start snap-always shrink-0 relative"
            >
              <MomentReelCard 
                moment={moment} 
                autoPlayVideo={true} 
                isImmersive={isImmersive}
                onToggleImmersive={toggleImmersive}
              />
              {/* Processing pill: files still awaiting ReceiveFileMarkedSuccess */}
              {processingMomentIds.includes(moment.id) && (
                <div className="absolute top-16 inset-x-0 z-40 flex justify-center pointer-events-none">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Đang xử lý ảnh/video...</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cursor paging indicator (overlay — must not affect snap layout) */}
      {moments.length > 0 && isLoadingMoreMoments && (
        <div className="absolute bottom-5 inset-x-0 z-30 flex justify-center pointer-events-none">
          <LogoLoader size="sm" text={null} />
        </div>
      )}

      {/* CREATE MOMENT MODAL */}
      {showCreateModal && (
        <CreateMomentModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* SHARED MOMENT (?momentId=) VIEWER */}
      {deepLinkMoment && (
        <MomentViewerModal
          moment={deepLinkMoment}
          onClose={() => setDeepLinkMoment(null)}
        />
      )}
    </div>
  );
};
