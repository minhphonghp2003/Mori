import React from 'react';
import Link from 'next/link';
import { useApp } from '../../context/AppContext';
import { requestScrollTop } from '@/hooks/use-scroll-to-top';
import { NavTab } from '../../types';
import { 
  Users, 
  Camera, 
  MapPin, 
  MessageCircle, 
  Settings 
} from 'lucide-react';

const TAB_HREF: Record<NavTab, string> = {
  home: '/nearby',
  moments: '/moments',
  map: '/location',
  chat: '/chat',
  setting: '/settings',
};

export const BottomNav: React.FC = () => {
  const { activeTab, conversations, totalUnreadCount } = useApp();

  const listUnread = conversations?.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || 0;
  // Server-pushed counter (ReceiveUnreadCount) covers conversations whose
  // rows are stale; the local sum covers rows the hub never touched.
  const totalUnread = Math.max(listUnread, totalUnreadCount || 0);

  // Tapping the active tab doesn't navigate — it scrolls that screen up.
  const handleTabClick = (tab: NavTab) => (e: React.MouseEvent) => {
    if (activeTab === tab) {
      e.preventDefault();
      requestScrollTop();
    }
  };

  return (
    <nav className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] z-30 select-none">
      <div className="grid grid-cols-5 items-center max-w-md mx-auto relative">
        
        {/* 1. HOME (Nearby Users) */}
        <Link
          href={TAB_HREF.home}
          onClick={handleTabClick('home')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'home' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <div className="relative p-1">
            <Users className={`w-5 h-5 transition-transform ${activeTab === 'home' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Gần bạn</span>
          {activeTab === 'home' && <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
        </Link>

        {/* 2. MOMENT */}
        <Link
          href={TAB_HREF.moments}
          onClick={handleTabClick('moments')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'moments' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <div className="relative p-1">
            <Camera className={`w-5 h-5 transition-transform ${activeTab === 'moments' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Khoảnh khắc</span>
          {activeTab === 'moments' && <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
        </Link>

        {/* 3. MAP (BIG ICON - CENTER FLOATING ACTION BUTTON) */}
        <div className="flex flex-col items-center justify-center relative -top-3">
          <Link
            href={TAB_HREF.map}
            onClick={handleTabClick('map')}
            className={`w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-green-700 text-white shadow-[0_8px_20px_rgba(16,185,129,0.38)] ring-4 ring-white dark:ring-[#09090b] flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 ${
              activeTab === 'map' ? 'scale-108 ring-emerald-100 shadow-[0_10px_25px_rgba(16,185,129,0.5)]' : 'hover:scale-105'
            }`}
            title="Bản đồ"
          >
            <MapPin className="w-6 h-6 stroke-[2.4] fill-white/20" />
          </Link>
        </div>

        {/* 4. CHAT */}
        <Link
          href={TAB_HREF.chat}
          onClick={handleTabClick('chat')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'chat' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <div className="relative p-1">
            <MessageCircle className={`w-5 h-5 transition-transform ${activeTab === 'chat' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs border-2 border-white dark:border-[#09090b] ring-1 ring-rose-500/20">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Tin nhắn</span>
          {activeTab === 'chat' && <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
        </Link>

        {/* 5. SETTING */}
        <Link
          href={TAB_HREF.setting}
          onClick={handleTabClick('setting')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'setting' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <div className="relative p-1">
            <Settings className={`w-5 h-5 transition-transform ${activeTab === 'setting' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Cài đặt</span>
          {activeTab === 'setting' && <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
        </Link>

      </div>
    </nav>
  );
};
