'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import MapGl, { Marker, type MapRef } from 'react-map-gl/maplibre';
import { useApp } from '../../context/AppContext';
import { useAppSelector } from '@/store/hooks';
import { env } from '@/config/env';
import { emptyUser } from '@/lib/chat/mappers';
import { getDistanceMeters, metersToKm } from '@/lib/location/geo';
import { LOCATION_RETRY_EVENT } from '@/providers/location-provider';
import type { User, VisibilityTier } from '../../types';
import { VISIBILITY_OPTIONS } from '@/constants/visibility';
import { 
  Navigation, 
  Plus, 
  Minus, 
  Edit3, 
  Check, 
  ShieldCheck,
  Lock,
  Users,
  Star,
  Heart,
  Globe,
  X,
  MapPin,
  Crosshair
} from 'lucide-react';

const DEFAULT_VIEW = { longitude: 105.854167, latitude: 21.028511, zoom: 12.5 };
const MAP_VIEW_KEY = 'mori.map.view';

type SavedView = { longitude: number; latitude: number; zoom: number };

const loadMapView = (): SavedView => {
  if (typeof window === 'undefined') return DEFAULT_VIEW;
  try {
    const raw = window.localStorage.getItem(MAP_VIEW_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<SavedView>;
      if (
        typeof v.longitude === 'number' &&
        typeof v.latitude === 'number' &&
        typeof v.zoom === 'number'
      ) {
        return v as SavedView;
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_VIEW;
};

export const LocationView: React.FC = () => {
  const { 
    currentUser, 
    friends, 
    setSelectedUser, 
    updateStatus,
    updateVisibility,
    refreshFriendships
  } = useApp();

  // Live location state (seeded by REST, kept fresh by hub events).
  const myPosition = useAppSelector((s) => s.location);
  const { latitude, longitude, status, visibility, locationDenied } = myPosition;
  const locations = useAppSelector((s) => s.location.locations);

  const mapRef = useRef<MapRef>(null);
  const [initialView] = useState<SavedView>(loadMapView);

  // Auto-center on the live position once per mount — later GPS updates
  // must not yank the map while the user is browsing.
  const centeredOnceRef = useRef(false);
  const tryCenterOnMe = () => {
    if (centeredOnceRef.current) return;
    const map = mapRef.current;
    if (!map || latitude == null || longitude == null) return;
    centeredOnceRef.current = true;
    map.flyTo({
      center: [longitude, latitude],
      zoom: Math.max(map.getZoom(), 14),
      duration: 800,
    });
  };
  useEffect(() => {
    tryCenterOnMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  // Marker relationship badges come from the API, not a stale session cache —
  // refetch friendships on entry so markers reflect current server state.
  useEffect(() => {
    void refreshFriendships();
  }, [refreshFriendships]);

  // Status edit modal for self marker
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState(currentUser.status);

  // Privacy / Visibility edit modal
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false);

  // Filter state: all, friends, strangers
  const [mapFilter, setMapFilter] = useState<'all' | 'friends' | 'strangers'>('all');
  // Canvas declutter: avatar-only below zoom 14; bubbles capped at ~8.
  const [mapZoom, setMapZoom] = useState<number>(initialView.zoom);
  // Two-step escalation to Public: pending tier + undo window.
  const [pendingPublic, setPendingPublic] = useState(false);
  const [visibilityUndo, setVisibilityUndo] = useState<VisibilityTier | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  const myId = currentUser.id;
  const myStatus = status || currentUser.status || 'Trực tuyến';
  const currentVisibility = (visibility ?? currentUser.visibility) as VisibilityTier;
  const hasMyPosition = latitude != null && longitude != null;
  // Free fallback tiles (no key) when the configured style host is
  // unreachable — e.g. DNS-blocked regional mirrors.
  const FALLBACK_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
  const primaryStyle = env.NEXT_PUBLIC_MAP_STYLE_URL || FALLBACK_MAP_STYLE;
  const [mapStyle, setMapStyle] = useState(primaryStyle);
  const hasMapStyle = !!mapStyle;

  // Visibility helper
  const getVisibilityInfo = (tier: VisibilityTier) => {
    switch (tier) {
      case 0:
        return {
          label: 'Chỉ mình tôi',
          shortLabel: 'Chỉ mình tôi',
          desc: 'Ẩn hoàn toàn vị trí khỏi bản đồ (Chế độ tàng hình)',
          badgeClass: 'border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-50/90 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20',
          dotClass: 'bg-rose-500',
          Icon: Lock
        };
      case 1:
        return {
          label: 'Bạn bè',
          shortLabel: 'Bạn bè',
          desc: 'Chỉ bạn bè trong danh bạ mới nhìn thấy',
          badgeClass: 'border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
          dotClass: 'bg-emerald-500',
          Icon: Users
        };
      case 2:
        return {
          label: 'Bạn thân',
          shortLabel: 'Bạn thân',
          desc: 'Chỉ danh sách Bạn thân xem được',
          badgeClass: 'border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20',
          dotClass: 'bg-amber-500',
          Icon: Star
        };
      case 3:
        return {
          label: 'Người yêu',
          shortLabel: 'Người yêu',
          desc: 'Chỉ chia sẻ riêng cho đối phương',
          badgeClass: 'border-pink-200 dark:border-pink-500/30 text-pink-700 dark:text-pink-300 bg-pink-50/90 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20',
          dotClass: 'bg-pink-500',
          Icon: Heart
        };
      case 4:
      default:
        return {
          label: 'Công khai',
          shortLabel: 'Công khai',
          desc: 'Mọi người quanh khu vực đều thấy (Kể cả người lạ) — cân nhắc kỹ',
          badgeClass: 'border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-200 bg-indigo-50/90 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25',
          dotClass: 'bg-indigo-500',
          Icon: Globe
        };
    }
  };

  const currentVisibilityInfo = getVisibilityInfo(currentVisibility);

  const friendsById = useMemo(() => new Map(friends.map((f) => [f.id, f])), [friends]);

  // Other people currently sharing location → design-shaped marker users.
  const markerUsers = useMemo(() => {
    const myNumericId = Number(myId);
    return locations
      .filter((l) => l.userId !== myNumericId)
      .map((l) => {
        const friend = friendsById.get(String(l.userId));
        const distanceMeters =
          hasMyPosition && latitude != null && longitude != null
            ? getDistanceMeters(latitude, longitude, l.latitude, l.longitude)
            : null;
        const user: User = {
          ...emptyUser(String(l.userId), l.name, l.image ?? ''),
          status: l.status ?? '',
          battery: l.battery ?? 0,
          location: { lat: l.latitude, lng: l.longitude, address: '', city: '' },
          visibility: l.visibility as VisibilityTier,
          relationship: friend?.relationship,
          distanceKm: distanceMeters != null ? metersToKm(distanceMeters) : undefined,
          distanceM: distanceMeters ?? undefined,
        };
        return { loc: l, user };
      });
  }, [locations, friendsById, myId, latitude, longitude, hasMyPosition]);

  const visibleUsers = markerUsers.filter(({ user }) => {
    const isFriend = user.relationship?.status === 'accepted';
    if (mapFilter === 'friends') return isFriend;
    if (mapFilter === 'strangers') return !isFriend;
    return true; // 'all'
  });

  const friendCount = useMemo(
    () => markerUsers.filter(({ user }) => user.relationship?.status === 'accepted').length,
    [markerUsers],
  );
  const strangerCount = markerUsers.length - friendCount;

  // Declutter: avatar-only below zoom 14; status bubbles capped to ~8.
  const showBubbles = mapZoom >= 14;
  const bubbleIds = useMemo(() => new Set(visibleUsers.slice(0, 8).map(({ user }) => user.id)), [visibleUsers]);
  const hiddenBubbleCount = Math.max(0, visibleUsers.length - bubbleIds.size);

  // Map controls -----------------------------------------------------------
  const persistView = () => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    setMapZoom(zoom);
    try {
      window.localStorage.setItem(
        MAP_VIEW_KEY,
        JSON.stringify({ longitude: center.lng, latitude: center.lat, zoom }),
      );
    } catch {
      // ignore storage errors
    }
  };

  const commitVisibility = (tier: VisibilityTier) => {
    if (tier === 4 && currentVisibility !== 4) {
      // Escalating to Public always asks inline first.
      setPendingPublic(true);
      return;
    }
    updateVisibility(tier);
    setIsEditingPrivacy(false);
    setPendingPublic(false);
  };

  const confirmPublic = () => {
    const prev = currentVisibility;
    updateVisibility(4);
    setIsEditingPrivacy(false);
    setPendingPublic(false);
    // Undo window — going Public should never feel irreversible.
    setVisibilityUndo(prev);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setVisibilityUndo(null), 2000);
  };

  const undoPublic = () => {
    if (visibilityUndo == null) return;
    updateVisibility(visibilityUndo);
    setVisibilityUndo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const centerOnUser = () => {
    if (!hasMyPosition || latitude == null || longitude == null) return;
    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 15, duration: 600 });
  };

  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    const next = Math.min(Math.max(map.getZoom() + delta, 1), 18);
    map.zoomTo(next, { duration: 250 });
  };

  const openStatusEditor = () => {
    setNewStatusInput(status || currentUser.status);
    setIsEditingStatus(true);
  };

  const requestLocationPermission = () => {
    window.dispatchEvent(new Event(LOCATION_RETRY_EVENT));
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Map Floating Header: 3 Filter Tabs + Visibility Changing Button */}
      <div className="absolute top-3 inset-x-2 z-20 flex items-start justify-between gap-1.5 pointer-events-auto">
        {/* 3 Filter Tabs — counts included, scrollable at 360px */}
        <div
          role="group"
          aria-label="Lọc người trên bản đồ"
          className="min-w-0 flex-1 max-w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-700 p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar"
        >
          {(
            [
              { id: 'all', label: `Tất cả (${markerUsers.length})` },
              { id: 'friends', label: `Bạn bè (${friendCount})` },
              { id: 'strangers', label: `Người lạ (${strangerCount})` },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMapFilter(opt.id)}
              aria-pressed={mapFilter === opt.id}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                mapFilter === opt.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Right: Current Visibility Indicator & Quick Edit Button */}
        <button
          onClick={() => setIsEditingPrivacy(true)}
          aria-label={`Quyền riêng tư vị trí: ${currentVisibilityInfo.label}. Chạm để chỉnh sửa`}
          title="Chạm để chỉnh sửa quyền riêng tư vị trí"
          className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border px-2.5 py-2 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${currentVisibilityInfo.badgeClass}`}
        >
          <currentVisibilityInfo.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="text-xs font-bold whitespace-nowrap truncate max-w-[min(88px,22vw)]">
            {currentVisibilityInfo.shortLabel}
          </span>
          <Edit3 className="w-3 h-3 opacity-60 ml-0.5 shrink-0" aria-hidden="true" />
        </button>
      </div>
      {/* Visibility undo banner (Public escalation) */}
      {visibilityUndo != null && (
        <div className="absolute top-[68px] inset-x-2 z-20 flex justify-center pointer-events-auto">
          <div role="status" className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-slate-900/95 text-white text-[11px] font-semibold shadow-xl border border-white/15 max-w-full">
            <span className="truncate">Đã bật Công khai — chạm để hoàn tác</span>
            <button
              type="button"
              onClick={undoPublic}
              aria-label="Hoàn tác bật công khai"
              className="px-3 min-h-[36px] rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Hoàn tác
            </button>
          </div>
        </div>
      )}
      {/* Cluster count when bubbles are capped */}
      {showBubbles && hiddenBubbleCount > 0 && (
        <div className="absolute bottom-24 inset-x-0 z-10 flex justify-center pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white text-[11px] font-semibold">
            Đang hiện {bubbleIds.size}/{visibleUsers.length} bong bóng
          </span>
        </div>
      )}

      {/* Map Interactive Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {hasMapStyle ? (
          <MapGl
            ref={mapRef}
            reuseMaps
            initialViewState={initialView}
            mapStyle={mapStyle}
            onMoveEnd={persistView}
            onLoad={tryCenterOnMe}
            onError={() => {
              // Style host unreachable → retry once with the fallback tiles.
              if (mapStyle !== FALLBACK_MAP_STYLE) setMapStyle(FALLBACK_MAP_STYLE);
            }}
            style={{ width: '100%', height: '100%' }}
            attributionControl={{ compact: true }}
          >
            {/* CURRENT USER MARKER */}
            {hasMyPosition && latitude != null && longitude != null && (
              <Marker longitude={longitude} latitude={latitude} anchor="center">
                <button
                  type="button"
                  aria-label={`Vị trí của bạn: ${myStatus}. Chạm để đổi trạng thái`}
                  onClick={openStatusEditor}
                  className="relative pointer-events-auto cursor-pointer group z-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-full"
                >
                    {/* Status speech bubble — visible Đổi trạng thái affordance */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white pl-2.5 pr-1.5 py-1 rounded-full shadow-lg border border-slate-200 text-[11px] font-bold text-slate-800 group-hover:scale-105 transition-transform flex items-center gap-1">
                      <span className="truncate max-w-[140px]">{myStatus}</span>
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center" title="Đổi trạng thái">
                        <Edit3 className="w-3 h-3" aria-hidden="true" />
                      </span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-slate-200" aria-hidden="true" />
                    </div>

                  {/* Avatar */}
                  <div className="relative w-11 h-11 rounded-full ring-2 ring-emerald-600 shadow-xl overflow-hidden bg-white">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-600 text-white text-lg font-bold">
                        {(currentUser.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Self Visibility Shield Indicator Badge on Avatar */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Quyền riêng tư: ${currentVisibilityInfo.label}. Chạm để chỉnh sửa`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingPrivacy(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditingPrivacy(true);
                      }
                    }}
                    className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-200 cursor-pointer hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    title={`Quyền riêng tư: ${currentVisibilityInfo.label}`}
                  >
                    <currentVisibilityInfo.Icon className={`w-3 h-3 ${currentVisibility === 4 ? 'text-indigo-600' : 'text-emerald-600'}`} aria-hidden="true" />
                  </span>
                </button>
              </Marker>
            )}

            {/* ALL ONLINE USERS MARKERS (FRIENDS & STRANGERS) */}
            {visibleUsers.map(({ loc, user }) => {
              const isFriend = user.relationship?.status === 'accepted';
              const isLover = user.relationship?.type === 'lover' && isFriend;
              const isBestFriend = user.relationship?.type === 'best_friend' && isFriend;
              const isStranger = !isFriend;
              const showBubble = showBubbles && bubbleIds.has(user.id);

              // Friends keep emerald; strangers move off emerald to slate so
              // Công khai green is never confused with stranger markers.
              let ringColor = 'ring-emerald-500';
              if (isLover) ringColor = 'ring-rose-500';
              else if (isBestFriend) ringColor = 'ring-amber-500';
              else if (isStranger) ringColor = 'ring-slate-400';

              return (
                <Marker
                  key={user.id}
                  longitude={loc.longitude}
                  latitude={loc.latitude}
                  anchor="center"
                >
                  <button
                    type="button"
                    aria-label={`${user.name}, ${user.status?.trim() || 'Trực tuyến'}, ${isStranger ? 'người lạ' : isLover ? 'người yêu' : isBestFriend ? 'bạn thân' : 'bạn bè'}${user.distanceM ? `, cách ${metersToKm(user.distanceM)} km` : ''}`}
                    onClick={() => setSelectedUser(user)}
                    className="relative pointer-events-auto cursor-pointer group transition-transform duration-200 hover:z-20 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-full"
                  >
                    {/* Status speech bubble — avatar-only when zoomed out or capped */}
                    {showBubble && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-2 py-0.5 rounded-full shadow-lg border border-slate-200 text-[10px] font-semibold text-slate-800 flex items-center gap-1 group-hover:scale-105 transition-transform">
                      {isLover && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />}
                      {isBestFriend && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />}
                      {isStranger && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />}
                      <span className="truncate max-w-[120px]">{user.status?.trim() || 'Trực tuyến'}</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-slate-200" aria-hidden="true" />
                    </div>
                    )}

                    {/* Ring and Avatar */}
                    <div className={`relative w-10 h-10 rounded-full ring-2 ${ringColor} shadow-lg overflow-hidden bg-white group-hover:ring-4 transition-all`}>
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          aria-hidden="true"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-base font-bold" aria-hidden="true">
                          {(user.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </button>
                </Marker>
              );
            })}
          </MapGl>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-6">
            <MapPin className="w-8 h-8 text-slate-300" aria-hidden="true" />
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Chưa tải được bản đồ</div>
            <p className="text-[11px] text-slate-400">
              Kiểm tra kết nối mạng rồi thử lại nhé.
            </p>
            <button
              type="button"
              onClick={() => setMapStyle(primaryStyle)}
              className="mt-2 px-4 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Location permission denied card */}
        {locationDenied && (
          <div className="absolute inset-x-3 bottom-3 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Crosshair className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Chưa cho phép truy cập vị trí</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Cho phép quyền vị trí để hiển thị bạn trên bản đồ và tìm người ở gần.
              </p>
            </div>
            <button
              onClick={requestLocationPermission}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              Bật quyền
            </button>
          </div>
        )}

        {/* MAP FLOATING CONTROLS (Right side) */}
        <div className="absolute right-3.5 bottom-6 flex flex-col gap-2 pointer-events-auto z-20">
          {/* Center on Me */}
          <button
            onClick={centerOnUser}
            disabled={!hasMyPosition}
            aria-label="Định vị của tôi"
            title="Định vị của tôi"
            className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Navigation className="w-5 h-5 fill-emerald-600 text-emerald-600" aria-hidden="true" />
          </button>

          {/* Zoom In */}
          <button
            onClick={() => zoomBy(1)}
            aria-label="Phóng to bản đồ"
            title="Phóng to"
            className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => zoomBy(-1)}
            aria-label="Thu nhỏ bản đồ"
            title="Thu nhỏ"
            className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Minus className="w-5 h-5" aria-hidden="true" />
          </button>

        </div>
      </div>

      {/* IN-MAP LOCATION PRIVACY MODAL (Same feature as privacy in settings) */}
      {isEditingPrivacy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditingPrivacy(false);
              setPendingPublic(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Quyền riêng tư vị trí"
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-150 motion-reduce:animate-none"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Quyền riêng tư vị trí</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Ai có thể nhìn thấy bạn trên bản đồ?</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditingPrivacy(false);
                  setPendingPublic(false);
                }}
                aria-label="Đóng quyền riêng tư vị trí"
                className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Current visibility status alert banner (no desc) */}
            <div className={`px-3 py-2.5 rounded-2xl border mb-3 flex items-center gap-2 ${currentVisibilityInfo.badgeClass}`}>
              <currentVisibilityInfo.Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-xs font-bold">Hiện tại: {currentVisibilityInfo.label}</span>
            </div>

            {/* Ring/badge legend — emerald is friends-only, strangers are slate */}
            <div className="px-1 pb-3 flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Chú thích màu viền">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" /> Bạn bè
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" /> Bạn thân
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" /> Người yêu
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400" aria-hidden="true" /> Người lạ
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" aria-hidden="true" /> Công khai
              </span>
            </div>

            {/* Visibility options list */}
            <div className="space-y-1.5 mb-4">
              {VISIBILITY_OPTIONS.map((opt) => {
                const isChecked = currentVisibility === opt.value;
                const info = getVisibilityInfo(opt.value as VisibilityTier);
                const IconComponent = info.Icon;

                return (
                  <button
                    key={opt.value}
                    aria-pressed={isChecked}
                    onClick={() => commitVisibility(opt.value as VisibilityTier)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      isChecked
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        <IconComponent className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs leading-tight">{opt.label}</div>
                        <div className={`text-[10px] truncate ${isChecked ? 'text-emerald-600/80 dark:text-emerald-300/80 font-normal' : 'text-slate-400 dark:text-slate-500 font-normal'}`}>
                          {opt.desc}
                        </div>
                      </div>
                    </div>

                    {isChecked && (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 ml-2" aria-hidden="true">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Inline confirm for Public escalation */}
            {pendingPublic && (
              <div role="alert" className="mb-3 px-3 py-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10">
                <p className="text-xs font-bold text-indigo-800 dark:text-indigo-100">
                  Bật Công khai? Mọi người quanh khu vực đều thấy bạn, kể cả người lạ.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPendingPublic(false)}
                    className="flex-1 py-2 min-h-[44px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    Để sau
                  </button>
                  <button
                    type="button"
                    onClick={confirmPublic}
                    aria-label="Xác nhận bật công khai"
                    className="flex-1 py-2 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    Bật Công khai
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setIsEditingPrivacy(false);
                setPendingPublic(false);
              }}
              className="w-full py-2.5 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* SELF STATUS EDIT MODAL */}
      {isEditingStatus && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsEditingStatus(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cập nhật trạng thái"
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-150 motion-reduce:animate-none"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Cập nhật trạng thái bạn bè</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Bạn bè trên bản đồ sẽ nhìn thấy bong bóng trạng thái này.
            </p>

            <div className="mb-4">
              <input
                type="text"
                value={newStatusInput}
                onChange={(e) => setNewStatusInput(e.target.value)}
                maxLength={45}
                autoFocus
                placeholder="VD: Đang cafe, Học bài..."
                aria-label="Trạng thái của bạn"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right mt-1">
                {newStatusInput.trim() ? `${newStatusInput.trim().length}/45 ký tự` : 'Nhập trạng thái để lưu (không lưu trạng thái trống)'}
              </div>
            </div>

            {/* Quick status recommendations */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {[
                'Đang cafe',
                'Tập gym chiều',
                'Học bài thư viện',
                'Đi dạo phố',
                'Ăn tối cùng bạn'
              ].map((rec) => (
                <button
                  key={rec}
                  onClick={() => setNewStatusInput(rec)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full transition-colors cursor-pointer"
                >
                  {rec}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingStatus(false)}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  updateStatus(newStatusInput.trim());
                  setIsEditingStatus(false);
                }}
                disabled={!newStatusInput.trim()}
                aria-label="Lưu trạng thái"
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
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
