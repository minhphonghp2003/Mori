import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAppSelector } from '@/store/hooks';
import { emptyUser } from '@/lib/chat/mappers';
import { getDistanceMeters, metersToKm } from '@/lib/location/geo';
import type { User } from '../../types';
import { 
  MapPin, 
  MessageCircle, 
  ArrowUpDown,
  Users
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { 
    currentUser,
    friends, 
    openChatWithUser, 
    setSelectedUser 
  } = useApp();

  const { latitude, longitude, locations } = useAppSelector((s) => s.location);

  const [sortOrder, setSortOrder] = useState<'nearest' | 'farthest'>('nearest');
  const [maxDistance, setMaxDistance] = useState<number | 'all'>('all');

  const hasMyPosition = latitude != null && longitude != null;
  const friendsById = useMemo(() => new Map(friends.map((f) => [f.id, f])), [friends]);

  // Active users near me (hub-fresh), shaped for the design rows.
  const nearbyUsers = useMemo(() => {
    const myNumericId = Number(currentUser.id);
    return locations
      .filter((l) => l.userId !== myNumericId)
      .map((l): User => {
        const friend = friendsById.get(String(l.userId));
        const distanceMeters =
          hasMyPosition && latitude != null && longitude != null
            ? getDistanceMeters(latitude, longitude, l.latitude, l.longitude)
            : null;
        return {
          ...emptyUser(String(l.userId), l.name, l.image ?? ''),
          status: l.status ?? '',
          battery: l.battery ?? 0,
          location: { lat: l.latitude, lng: l.longitude, address: '', city: '' },
          relationship: friend?.relationship,
          distanceKm: distanceMeters != null ? metersToKm(distanceMeters) : undefined,
        };
      });
  }, [locations, friendsById, currentUser.id, latitude, longitude, hasMyPosition]);

  // Filter and sort nearby users
  const visibleUsers = useMemo(() => {
    return [...nearbyUsers]
      .filter((user) => {
        const dist = user.distanceKm ?? 999;
        if (maxDistance !== 'all' && dist > maxDistance) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const distA = a.distanceKm ?? 999;
        const distB = b.distanceKm ?? 999;
        return sortOrder === 'nearest' ? distA - distB : distB - distA;
      });
  }, [nearbyUsers, sortOrder, maxDistance]);

  const renderGenderIcon = (gender?: string) => {
    const g = (gender || '').toLowerCase();
    if (g.includes('nam') || g === 'male') {
      return (
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold shrink-0" title="Nam">
          ♂
        </span>
      );
    }
    if (g.includes('nữ') || g === 'female') {
      return (
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-pink-100 text-pink-600 text-[10px] font-bold shrink-0" title="Nữ">
          ♀
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-purple-100 text-purple-600 text-[10px] font-bold shrink-0" title="Khác">
        ⚧
      </span>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-50 overflow-y-auto no-scrollbar select-none">
      {/* Compact Sort & Filter Bar (No header) */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-3 py-2.5 shadow-xs flex items-center justify-between gap-2">
        {/* Distance Range Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setMaxDistance('all')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all cursor-pointer whitespace-nowrap ${
              maxDistance === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setMaxDistance(1)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all cursor-pointer whitespace-nowrap ${
              maxDistance === 1
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            &lt; 1km
          </button>
          <button
            onClick={() => setMaxDistance(3)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all cursor-pointer whitespace-nowrap ${
              maxDistance === 3
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            &lt; 3km
          </button>
          <button
            onClick={() => setMaxDistance(5)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all cursor-pointer whitespace-nowrap ${
              maxDistance === 5
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            &lt; 5km
          </button>
        </div>

        {/* Sort by Distance Toggle Button */}
        <button
          onClick={() => setSortOrder(prev => prev === 'nearest' ? 'farthest' : 'nearest')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer shrink-0 border border-slate-200/60 shadow-xs active:scale-95"
          title="Đổi thứ tự khoảng cách"
        >
          <ArrowUpDown className="w-3 h-3 text-indigo-600" />
          <span>{sortOrder === 'nearest' ? 'Gần nhất' : 'Xa nhất'}</span>
        </button>
      </div>

      {/* Compact Nearby Users List */}
      <div className="p-3 space-y-2 max-w-lg mx-auto w-full pb-16">
        {visibleUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl p-6 border border-slate-100">
            <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-700">Không có người dùng quanh bán kính này</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Hãy chọn "Tất cả" hoặc mở rộng bán kính để tìm kiếm quanh bạn.
            </p>
          </div>
        ) : (
          visibleUsers.map((user) => {
            return (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="bg-white rounded-2xl p-2.5 border border-slate-100/90 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-2.5"
              >
                {/* Left: Avatar with online dot */}
                <div className="relative shrink-0">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-2xl object-cover ring-1 ring-slate-100 group-hover:ring-indigo-500 transition-all"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>

                {/* Middle: User details */}
                <div className="min-w-0 flex-1">
                  {/* Name, age, gender & distance */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {user.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {user.age > 0 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {user.age}t
                          </span>
                        )}
                        {renderGenderIcon(user.gender)}
                      </div>
                    </div>

                    {user.distanceKm !== undefined && (
                      <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold shrink-0">
                        <MapPin className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                        <span>{user.distanceKm} km</span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="text-[11px] text-slate-600 truncate font-medium">
                    "{user.status}"
                  </div>

                  {/* Address — API has no reverse-geocode address, so only show coordinates */}
                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                    <span className="truncate">
                      {user.location.lat.toFixed(5)}, {user.location.lng.toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* Right: Only Send Message Button */}
                <div className="shrink-0 pl-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openChatWithUser(user)}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                    title={`Nhắn tin cho ${user.name}`}
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>Nhắn</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
