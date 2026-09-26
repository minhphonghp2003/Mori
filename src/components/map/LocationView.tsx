import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { VisibilityTier } from '../../types';
import { VISIBILITY_OPTIONS } from '../../data/mockData';
import { 
  Navigation, 
  Plus, 
  Minus, 
  Compass, 
  Edit3, 
  Check, 
  ShieldCheck,
  Lock,
  Users,
  Star,
  Heart,
  Globe,
  X
} from 'lucide-react';

export const LocationView: React.FC = () => {
  const { 
    currentUser, 
    friends, 
    setSelectedUser, 
    updateStatus,
    updateVisibility
  } = useApp();

  // Map viewport state: pan offset and zoom level
  const [mapPos, setMapPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Status edit modal for self marker
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState(currentUser.status);

  // Privacy / Visibility edit modal
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false);


  // Base map center (Hanoi Old Quarter)
  // Let's project lat/lng differences onto pixel offsets
  const BASE_LAT = 21.028511;
  const BASE_LNG = 105.854167;
  const LAT_SCALE = 9000;
  const LNG_SCALE = 9000;

  const getMarkerCoords = (lat: number, lng: number) => {
    const x = (lng - BASE_LNG) * LNG_SCALE * zoom + mapPos.x;
    const y = -(lat - BASE_LAT) * LAT_SCALE * zoom + mapPos.y;
    return { x, y };
  };

  // Center map on user
  const centerOnUser = (lat: number, lng: number) => {
    const targetX = -(lng - BASE_LNG) * LNG_SCALE * zoom;
    const targetY = (lat - BASE_LAT) * LAT_SCALE * zoom;
    setMapPos({ x: targetX, y: targetY });
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - mapPos.x, y: e.clientY - mapPos.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setMapPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - mapPos.x,
        y: e.touches[0].clientY - mapPos.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setMapPos({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Visibility helper
  const getVisibilityInfo = (tier: VisibilityTier) => {
    switch (tier) {
      case 0:
        return {
          label: 'Chỉ mình tôi',
          shortLabel: 'Chỉ mình tôi',
          desc: 'Ẩn hoàn toàn vị trí khỏi bản đồ (Chế độ tàng hình)',
          badgeClass: 'border-rose-200 text-rose-700 bg-rose-50/90 hover:bg-rose-100',
          dotClass: 'bg-rose-500',
          Icon: Lock
        };
      case 1:
        return {
          label: 'Bạn bè',
          shortLabel: 'Bạn bè',
          desc: 'Chỉ bạn bè trong danh bạ mới nhìn thấy',
          badgeClass: 'border-indigo-200 text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100',
          dotClass: 'bg-indigo-500',
          Icon: Users
        };
      case 2:
        return {
          label: 'Bạn thân',
          shortLabel: 'Bạn thân',
          desc: 'Chỉ danh sách Bạn thân xem được',
          badgeClass: 'border-amber-200 text-amber-700 bg-amber-50/90 hover:bg-amber-100',
          dotClass: 'bg-amber-500',
          Icon: Star
        };
      case 3:
        return {
          label: 'Người yêu',
          shortLabel: 'Người yêu',
          desc: 'Chỉ chia sẻ riêng cho đối phương',
          badgeClass: 'border-pink-200 text-pink-700 bg-pink-50/90 hover:bg-pink-100',
          dotClass: 'bg-pink-500',
          Icon: Heart
        };
      case 4:
      default:
        return {
          label: 'Công khai',
          shortLabel: 'Công khai',
          desc: 'Mọi người quanh khu vực đều thấy (Kể cả người lạ)',
          badgeClass: 'border-emerald-200 text-emerald-700 bg-emerald-50/90 hover:bg-emerald-100',
          dotClass: 'bg-emerald-500',
          Icon: Globe
        };
    }
  };

  const currentVisibilityInfo = getVisibilityInfo(currentUser.visibility);

  // Filter state: all, friends, strangers
  const [mapFilter, setMapFilter] = useState<'all' | 'friends' | 'strangers'>('all');

  const visibleUsers = friends.filter((u) => {
    const isFriend = u.relationship?.status === 'accepted';
    if (mapFilter === 'friends') return isFriend;
    if (mapFilter === 'strangers') return !isFriend;
    return true; // 'all'
  });

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-50 overflow-hidden select-none">
      {/* Top Map Floating Header: 3 Filter Tabs + Visibility Changing Button */}
      <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
        {/* 3 Filter Tabs */}
        <div className="bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 p-1 rounded-2xl flex items-center gap-1">
          <button
            onClick={() => setMapFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              mapFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setMapFilter('friends')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              mapFilter === 'friends'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Bạn bè
          </button>
          <button
            onClick={() => setMapFilter('strangers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              mapFilter === 'strangers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Người lạ
          </button>
        </div>

        {/* Right: Current Visibility Indicator & Quick Edit Button */}
        <button
          onClick={() => setIsEditingPrivacy(true)}
          className={`bg-white/95 backdrop-blur-md shadow-lg border px-3 py-2 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 ${currentVisibilityInfo.badgeClass}`}
          title="Chạm để chỉnh sửa quyền riêng tư vị trí"
        >
          <currentVisibilityInfo.Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-bold whitespace-nowrap">
            {currentVisibilityInfo.shortLabel}
          </span>
          <Edit3 className="w-3 h-3 opacity-60 ml-0.5 shrink-0" />
        </button>
      </div>

      {/* Map Interactive Canvas */}
      <div 
        className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Render Vector Map Background */}
        <div 
          className="absolute inset-0 transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${mapPos.x}px, ${mapPos.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Stylized Map Vector Artwork representing Hanoi city roads, lakes and parks */}
          <svg className="w-[1800px] h-[1800px] -translate-x-[450px] -translate-y-[450px]" viewBox="0 0 1200 1200" fill="none">
            {/* Background land */}
            <rect width="1200" height="1200" fill="#f1f5f9" />

            {/* City grid lines */}
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="1200" height="1200" fill="url(#grid)" />

            {/* Red River (Sông Hồng) */}
            <path
              d="M 200 0 C 350 200, 500 250, 800 500 C 1000 650, 1150 900, 1200 1200"
              stroke="#bfdbfe"
              strokeWidth="90"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M 200 0 C 350 200, 500 250, 800 500 C 1000 650, 1150 900, 1200 1200"
              stroke="#93c5fd"
              strokeWidth="70"
              fill="none"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* West Lake (Hồ Tây) */}
            <path
              d="M 380 250 C 450 180, 560 210, 600 290 C 630 360, 570 420, 500 440 C 420 460, 340 400, 330 330 Z"
              fill="#bae6fd"
              stroke="#7dd3fc"
              strokeWidth="4"
              opacity="0.9"
            />
            <text x="440" y="330" fill="#0284c7" fontSize="14" fontWeight="600" opacity="0.6">Hồ Tây</text>

            {/* Truc Bach Lake */}
            <ellipse cx="610" cy="350" rx="35" ry="25" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="2" />

            {/* Sword Lake (Hồ Hoàn Kiếm) */}
            <path
              d="M 600 580 C 610 560, 630 570, 635 600 C 640 640, 620 670, 605 680 C 590 690, 580 670, 585 640 Z"
              fill="#bae6fd"
              stroke="#38bdf8"
              strokeWidth="3"
            />
            <text x="635" y="630" fill="#0284c7" fontSize="12" fontWeight="700">Hồ Hoàn Kiếm</text>

            {/* Thong Nhat Park & Bay Mau Lake */}
            <rect x="540" y="740" width="100" height="90" rx="20" fill="#dcfce7" />
            <ellipse cx="590" cy="785" rx="35" ry="25" fill="#bae6fd" />
            <text x="560" y="770" fill="#16a34a" fontSize="11" fontWeight="600">CV Thống Nhất</text>

            {/* Major Arterial Roads */}
            {/* Ring Road 2 */}
            <path d="M 150 450 Q 550 520 1100 480" stroke="#cbd5e1" strokeWidth="16" fill="none" />
            <path d="M 150 450 Q 550 520 1100 480" stroke="#ffffff" strokeWidth="10" fill="none" />

            {/* Ring Road 1 */}
            <path d="M 250 620 Q 600 660 1050 620" stroke="#cbd5e1" strokeWidth="14" fill="none" />
            <path d="M 250 620 Q 600 660 1050 620" stroke="#ffffff" strokeWidth="8" fill="none" />

            {/* North-South Axis */}
            <path d="M 600 100 L 600 1100" stroke="#cbd5e1" strokeWidth="14" fill="none" />
            <path d="M 600 100 L 600 1100" stroke="#ffffff" strokeWidth="8" fill="none" />

            {/* Diagonal Avenues */}
            <path d="M 300 200 L 900 900" stroke="#ffffff" strokeWidth="8" fill="none" />
            <path d="M 900 250 L 300 850" stroke="#ffffff" strokeWidth="8" fill="none" />

            {/* Landmark text labels */}
            <text x="490" y="470" fill="#64748b" fontSize="13" fontWeight="bold">Ba Đình</text>
            <text x="680" y="560" fill="#64748b" fontSize="13" fontWeight="bold">Phố Cổ</text>
            <text x="660" y="720" fill="#64748b" fontSize="13" fontWeight="bold">Hai Bà Trưng</text>
            <text x="350" y="550" fill="#64748b" fontSize="13" fontWeight="bold">Cầu Giấy</text>
          </svg>
        </div>

        {/* MAP MARKERS LAYER */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full">
            {/* Center anchor (screen middle) */}
            <div className="absolute left-1/2 top-1/2">
              {/* CURRENT USER MARKER */}
              {(() => {
                const pos = getMarkerCoords(currentUser.location.lat, currentUser.location.lng);
                return (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group z-30"
                    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    onClick={() => setIsEditingStatus(true)}
                  >
                    {/* Status speech bubble with privacy indicator */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-2.5 py-1 rounded-full shadow-lg border border-slate-200 text-[11px] font-bold text-slate-800 flex items-center gap-1.5 group-hover:scale-105 transition-transform">
                      <span>{currentUser.status}</span>
                      <div className="h-3 w-px bg-slate-200" />
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingPrivacy(true);
                        }}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Đổi quyền riêng tư vị trí"
                      >
                        <currentVisibilityInfo.Icon className="w-3 h-3 text-indigo-500" />
                        <span className="font-semibold">{currentVisibilityInfo.shortLabel}</span>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-slate-200" />
                    </div>

                    {/* Pulse Animation Ring */}
                    <span className="absolute -inset-2.5 bg-indigo-500/20 rounded-full animate-ping" />
                    <span className="absolute -inset-1.5 bg-indigo-500/30 rounded-full" />

                    {/* Avatar */}
                    <div className="relative w-11 h-11 rounded-full ring-3 ring-indigo-600 shadow-xl overflow-hidden bg-white">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Self Visibility Shield Indicator Badge on Avatar */}
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingPrivacy(true);
                      }}
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-200 cursor-pointer hover:scale-110 transition-transform"
                      title={`Quyền riêng tư: ${currentVisibilityInfo.label}`}
                    >
                      <currentVisibilityInfo.Icon className="w-2.5 h-2.5 text-indigo-600" />
                    </span>
                  </div>
                );
              })()}

              {/* ALL ONLINE USERS MARKERS (FRIENDS & STRANGERS) */}
              {visibleUsers.map((user) => {
                const pos = getMarkerCoords(user.location.lat, user.location.lng);
                const isFriend = user.relationship?.status === 'accepted';
                const isLover = user.relationship?.type === 'lover' && isFriend;
                const isBestFriend = user.relationship?.type === 'best_friend' && isFriend;
                const isStranger = !isFriend;

                let ringColor = 'ring-indigo-500';
                if (isLover) ringColor = 'ring-rose-500';
                else if (isBestFriend) ringColor = 'ring-amber-500';
                else if (isStranger) ringColor = 'ring-emerald-500';

                return (
                  <div
                    key={user.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group z-10 transition-transform duration-200 hover:z-20 hover:scale-105"
                    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    onClick={() => setSelectedUser(user)}
                  >
                    {/* Status speech bubble */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-2 py-0.5 rounded-full shadow-lg border border-slate-200 text-[10px] font-semibold text-slate-800 flex items-center gap-1 group-hover:scale-105 transition-transform">
                      {isLover && <span className="text-rose-500">❤️</span>}
                      {isBestFriend && <span className="text-amber-500">⭐</span>}
                      {isStranger && <span className="text-emerald-500">🌐</span>}
                      <span>{user.status}</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-slate-200" />
                    </div>

                    {/* Ring and Avatar */}
                    <div className={`relative w-10 h-10 rounded-full ring-3 ${ringColor} shadow-lg overflow-hidden bg-white group-hover:ring-4 transition-all`}>
                      <img
                        src={user.avatar}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Online / Stranger Indicator badge */}
                    {isStranger && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-xs" title="Người lạ online">
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAP FLOATING CONTROLS (Right side) */}
        <div className="absolute right-3.5 bottom-6 flex flex-col gap-2 pointer-events-auto z-20">
          {/* Center on Me */}
          <button
            onClick={() => centerOnUser(currentUser.location.lat, currentUser.location.lng)}
            className="w-11 h-11 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
            title="Định vị của tôi"
          >
            <Navigation className="w-5 h-5 fill-indigo-600 text-indigo-600" />
          </button>

          {/* Zoom In */}
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.25, 2.5))}
            className="w-11 h-11 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-700 hover:text-indigo-600 transition-all cursor-pointer active:scale-95"
            title="Phóng to"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.6))}
            className="w-11 h-11 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-700 hover:text-indigo-600 transition-all cursor-pointer active:scale-95"
            title="Thu nhỏ"
          >
            <Minus className="w-5 h-5" />
          </button>

          {/* Compass / Reset Pan */}
          <button
            onClick={() => {
              setMapPos({ x: 0, y: 0 });
              setZoom(1);
            }}
            className="w-11 h-11 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-700 hover:text-indigo-600 transition-all cursor-pointer active:scale-95"
            title="Đặt lại bản đồ"
          >
            <Compass className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* IN-MAP LOCATION PRIVACY MODAL (Same feature as privacy in settings) */}
      {isEditingPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Quyền riêng tư vị trí</h3>
                  <p className="text-[10px] text-slate-500">Ai có thể nhìn thấy bạn trên bản đồ?</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingPrivacy(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current visibility status alert banner (no desc) */}
            <div className={`px-3 py-2.5 rounded-2xl border mb-3 flex items-center gap-2 ${currentVisibilityInfo.badgeClass}`}>
              <currentVisibilityInfo.Icon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold">Hiện tại: {currentVisibilityInfo.label}</span>
            </div>

            {/* Visibility options list */}
            <div className="space-y-1.5 mb-4">
              {VISIBILITY_OPTIONS.map((opt) => {
                const isChecked = currentUser.visibility === opt.value;
                const info = getVisibilityInfo(opt.value as VisibilityTier);
                const IconComponent = info.Icon;

                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      updateVisibility(opt.value as VisibilityTier);
                      setIsEditingPrivacy(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border border-transparent text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs leading-tight">{opt.label}</div>
                        <div className={`text-[10px] truncate ${isChecked ? 'text-indigo-600/80 font-normal' : 'text-slate-400 font-normal'}`}>
                          {opt.desc}
                        </div>
                      </div>
                    </div>

                    {isChecked && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 ml-2">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsEditingPrivacy(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* SELF STATUS EDIT MODAL */}
      {isEditingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Cập nhật trạng thái bạn bè</h3>
            <p className="text-xs text-slate-500 mb-4">
              Bạn bè trên bản đồ sẽ nhìn thấy bong bóng trạng thái này.
            </p>

            <div className="mb-4">
              <input
                type="text"
                value={newStatusInput}
                onChange={(e) => setNewStatusInput(e.target.value)}
                maxLength={45}
                placeholder="VD: Đang cafe ☕, Học bài 📚..."
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="text-[10px] text-slate-400 text-right mt-1">
                {newStatusInput.length}/45 ký tự
              </div>
            </div>

            {/* Quick status recommendations */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {[
                'Đang cafe ☕',
                'Tập gym chiều 💪',
                'Học bài thư viện 📚',
                'Đi dạo phố 🛵',
                'Ăn tối cùng bạn 🍲'
              ].map((rec) => (
                <button
                  key={rec}
                  onClick={() => setNewStatusInput(rec)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors cursor-pointer"
                >
                  {rec}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingStatus(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (newStatusInput.trim()) {
                    updateStatus(newStatusInput.trim());
                  }
                  setIsEditingStatus(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Lưu trạng thái
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
