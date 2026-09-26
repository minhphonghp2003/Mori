import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavTab } from '../../types';
import { 
  Users, 
  Camera, 
  MapPin, 
  MessageCircle, 
  Settings 
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setActiveConversationId, 
    setActiveTimelineId,
    conversations
  } = useApp();

  const totalUnread = conversations?.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || 0;

  const handleTabClick = (tabId: NavTab) => {
    setActiveTab(tabId);
    if (tabId !== 'chat') {
      setActiveConversationId(null);
    }
    if (tabId !== 'setting') {
      setActiveTimelineId(null);
    }
  };

  return (
    <nav className="shrink-0 bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] px-2 pt-1 pb-1.5 z-30 select-none">
      <div className="grid grid-cols-5 items-center max-w-md mx-auto relative">
        
        {/* 1. HOME (Nearby Users) */}
        <button
          onClick={() => handleTabClick('home')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'home' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative p-1">
            <Users className={`w-5 h-5 transition-transform ${activeTab === 'home' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Gần bạn</span>
          {activeTab === 'home' && <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
        </button>

        {/* 2. MOMENT */}
        <button
          onClick={() => handleTabClick('moments')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'moments' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative p-1">
            <Camera className={`w-5 h-5 transition-transform ${activeTab === 'moments' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Khoảnh khắc</span>
          {activeTab === 'moments' && <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
        </button>

        {/* 3. MAP (BIG ICON - CENTER FLOATING ACTION BUTTON) */}
        <div className="flex flex-col items-center justify-center relative -top-3">
          <button
            onClick={() => handleTabClick('map')}
            className={`w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.38)] ring-4 ring-white flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 ${
              activeTab === 'map' ? 'scale-108 ring-indigo-100 shadow-[0_10px_25px_rgba(79,70,229,0.5)]' : 'hover:scale-105'
            }`}
            title="Bản đồ"
          >
            <MapPin className="w-6 h-6 stroke-[2.4] fill-white/20" />
          </button>
        </div>

        {/* 4. CHAT */}
        <button
          onClick={() => handleTabClick('chat')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'chat' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative p-1">
            <MessageCircle className={`w-5 h-5 transition-transform ${activeTab === 'chat' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs border-2 border-white ring-1 ring-rose-500/20">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Tin nhắn</span>
          {activeTab === 'chat' && <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
        </button>

        {/* 5. SETTING */}
        <button
          onClick={() => handleTabClick('setting')}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'setting' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative p-1">
            <Settings className={`w-5 h-5 transition-transform ${activeTab === 'setting' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Cài đặt</span>
          {activeTab === 'setting' && <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
        </button>

      </div>
    </nav>
  );
};
