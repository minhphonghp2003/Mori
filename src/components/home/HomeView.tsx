import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { emptyUser } from '@/lib/chat/mappers';
import { formatDistance } from '@/lib/location/geo';
import { getAllUsers } from '@/services/user';
import type { UserListItemDto } from '@/types/user';
import type { User } from '../../types';
import { 
  MapPin,
  MessageCircle, 
  Users
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { 
    currentUser,
    friends, 
    openChatWithUser, 
    setSelectedUser 
  } = useApp();

  const [genderFilter, setGenderFilter] = useState<'all' | 'Nam' | 'Nữ'>('all');

  // Full roster (GET /api/user — online + offline, no visibility gate),
  // filtered server-side by genderId following the API input.
  const [roster, setRoster] = useState<UserListItemDto[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setIsLoadingRoster(true);
      try {
        const genderId = genderFilter === 'Nam' ? 1 : genderFilter === 'Nữ' ? 2 : undefined;
        const out: UserListItemDto[] = [];
        let prevId: number | null = null;
        for (let page = 0; page < 10; page++) {
          const res = await getAllUsers({ prevId, take: 100, genderId });
          out.push(...res.data);
          if (!res.hasMore || res.prevId == null) break;
          prevId = res.prevId;
        }
        if (alive) setRoster(out);
      } catch (err) {
        console.error('[HomeView] getAllUsers failed:', err);
      } finally {
        if (alive) setIsLoadingRoster(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [genderFilter]);

  const nearbyUsers: (User & { isOnline: boolean })[] = useMemo(() => {
    const myNumericId = Number(currentUser.id);
    const friendsById = new Map(friends.map((f) => [f.id, f]));
    return roster
      .filter((u) => u.userId !== myNumericId)
      .map((u) => {
        const friend = friendsById.get(String(u.userId));
        return {
          ...emptyUser(String(u.userId), u.name, u.image ?? ''),
          age: 0,
          gender: u.genderId === 1 ? 'Nam' : u.genderId === 2 ? 'Nữ' : 'Khác',
          status: u.status ?? '',
          battery: u.battery ?? 0,
          location: { lat: u.latitude ?? 0, lng: u.longitude ?? 0, address: '', city: '' },
          relationship: friend?.relationship,
          // Raw server meters (null/0 = hidden); the chip formats m/km.
          distanceM: u.distance || undefined,
          isOnline: u.isOnline,
        };
      });
  }, [roster, friends, currentUser.id]);

  // Server order (userId desc) — no client sort/filter beyond gender.
  const visibleUsers = nearbyUsers;

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
    <div className="relative w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto no-scrollbar select-none">
      {/* Compact Gender Filter Bar (server-side genderId, no header) */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-3 py-2.5 shadow-xs flex items-center gap-2">
        {/* Gender Filter Chips — follows GET /api/user ?genderId= */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
          {(
            [
              { id: 'all', label: 'Tất cả' },
              { id: 'Nam', label: 'Nam' },
              { id: 'Nữ', label: 'Nữ' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setGenderFilter(opt.id)}
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                genderFilter === opt.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Nearby Users List */}
      <div className="p-3 space-y-2 max-w-lg mx-auto w-full pb-16">
        {visibleUsers.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
            {isLoadingRoster ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 animate-pulse">
                Đang tải danh sách...
              </p>
            ) : (
              <>
                <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Không có người dùng nào</div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Hãy thử bộ lọc giới tính khác.
                </p>
              </>
            )}
          </div>
        ) : (
          visibleUsers.map((user) => {
            return (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-100/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-2.5"
              >
                {/* Left: Avatar */}
                <div className="relative shrink-0">
                  <Avatar
                    src={user.avatar}
                    name={user.name}
                    className="w-11 h-11 rounded-2xl object-cover ring-1 ring-slate-100 group-hover:ring-indigo-500 transition-all"
                  />
                </div>

                {/* Middle: User details */}
                <div className="min-w-0 flex-1">
                  {/* Name, age, gender & distance */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {user.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {user.age > 0 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {user.age}t
                          </span>
                        )}
                        {renderGenderIcon(user.gender)}
                      </div>
                    </div>

                    {user.distanceM ? (
                      <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold shrink-0">
                        <MapPin className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>{formatDistance(user.distanceM)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Status — his current status only, nothing when empty */}
                  {user.status?.trim() ? (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate font-medium">
                      {user.status}
                    </div>
                  ) : null}

                  {/* Coordinates — only when a live fix backs them */}
                  {user.isOnline && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <span className="truncate">
                        {user.location.lat.toFixed(5)}, {user.location.lng.toFixed(5)}
                      </span>
                    </div>
                  )}
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
