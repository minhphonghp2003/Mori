import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CreateMomentModal } from './CreateMomentModal';
import { MomentReelCard } from './MomentReelCard';
import { Plus, Camera, Sparkles, Film } from 'lucide-react';

export const MomentsView: React.FC = () => {
  const { 
    moments, 
    setIsNavHidden 
  } = useApp();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const feedContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  // Sync immersive state with global bottom navigation bar visibility
  useEffect(() => {
    setIsNavHidden(isImmersive);
  }, [isImmersive, setIsNavHidden]);

  // Handle scroll detection: when scrolling down/up in feed, automatically hide nav bar for full immersion
  const handleScroll = () => {
    if (!feedContainerRef.current) return;
    const currentScrollTop = feedContainerRef.current.scrollTop;
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

      {/* Main Reels / TikTok Vertical Snapping Feed */}
      {moments.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white bg-slate-950">
          <Film className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold whitespace-nowrap truncate">Chưa có khoảnh khắc nào</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4 max-w-xs">
            Hãy bấm nút Đăng ở góc trên để tạo ảnh hoặc video đầu tiên của bạn!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-pink-500 rounded-full text-xs font-bold text-white shadow-lg cursor-pointer whitespace-nowrap truncate flex items-center gap-1.5"
          >
            <Camera className="w-4 h-4" />
            <span>Tạo khoảnh khắc ngay</span>
          </button>
        </div>
      ) : (
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
            </div>
          ))}
        </div>
      )}

      {/* CREATE MOMENT MODAL */}
      {showCreateModal && (
        <CreateMomentModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};
