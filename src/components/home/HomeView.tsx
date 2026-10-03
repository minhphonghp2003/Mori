import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { emptyUser } from '@/lib/chat/mappers';
import { formatDistance } from '@/lib/location/geo';
import { getAllUsers } from '@/services/user';
import { useFirstMessage } from '@/hooks/chat/use-first-message';
import { LogoLoader } from '../common/LogoLoader';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';
import { FirstMessageModal } from '../chat/FirstMessageModal';
import type { UserListItemDto } from '@/types/user';
import type { User } from '../../types';
import {
  MapPin,
  MessageCircle,
  Users,
  Mars,
  Venus,
  Transgender
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    currentUser,
    friends,
    setSelectedUser
  } = useApp();
  const {
    greetingTarget,
    greetingText,
    setGreetingText,
    isSendingGreeting,
    startGreetingChat,
    closeGreeting,
    sendGreeting
  } = useFirstMessage();

  const [genderFilter, setGenderFilter] = useState<'all' | 'Nam' | 'Nữ'>('all');

  // First-message flow is shared (see useFirstMessage) — also used by
  // the location profile dialog.

  // Full roster (GET /api/user — online + offline, no visibility gate),
  // filtered server-side by genderId following the API input.
  // Infinite scroll: seed/prevId persist across pages of one shuffle.
  const [roster, setRoster] = useState<UserListItemDto[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pagingRef = useRef<{ seed: number | null; prevId: number | null; hasMore: boolean }>({
    seed: null,
    prevId: null,
    hasMore: true,
  });
  const seenRef = useRef<Set<number>>(new Set());
  const loadingRef = useRef(false);
  /** Consecutive fresh shuffles that added nothing (skewed shuffle cover). */
  const emptyStreakRef = useRef(0);
  /** True only after the empty budget is spent. */
  const exhaustedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Tapping the active Gần bạn tab scrolls this list up.
  useScrollToTop(scrollRef);

  const fetchPage = useCallback(
    async (reset: boolean, gender: typeof genderFilter) => {
      if (loadingRef.current) return;
      if (!reset && (!pagingRef.current.hasMore || exhaustedRef.current)) return;
      loadingRef.current = true;
      if (reset) setIsLoadingRoster(true);
      else setIsLoadingMore(true);

      const runOnce = async (freshCursor: boolean) => {
        const res = await getAllUsers({
          take: 50,
          genderId: gender === 'Nam' ? 1 : gender === 'Nữ' ? 2 : undefined,
          seed: freshCursor ? undefined : (pagingRef.current.seed ?? undefined),
          prevId: freshCursor ? undefined : (pagingRef.current.prevId ?? undefined),
        });
        const fresh: UserListItemDto[] = [];
        for (const u of res.data) {
          if (!seenRef.current.has(u.userId)) {
            seenRef.current.add(u.userId);
            fresh.push(u);
          }
        }
        if (res.seed != null) pagingRef.current.seed = res.seed;
        pagingRef.current.prevId = res.prevId;
        pagingRef.current.hasMore = res.hasMore;
        return fresh;
      };

      try {
        if (reset) {
          pagingRef.current = { seed: null, prevId: null, hasMore: true };
          seenRef.current = new Set();
          exhaustedRef.current = false;
          emptyStreakRef.current = 0;
          const fresh = await runOnce(true);
          setRoster(fresh);
          if (fresh.length === 0) exhaustedRef.current = true;
        } else {
          const fresh = await runOnce(false);
          if (fresh.length > 0) {
            emptyStreakRef.current = 0;
            setRoster((prev) => [...prev, ...fresh]);
          } else {
            // Zero new rows: the cursor may be stuck returning a seen
            // window — retry with fresh shuffles (bounded) before giving up.
            let recovered: UserListItemDto[] = [];
            while (emptyStreakRef.current < 4) {
              emptyStreakRef.current += 1;
              recovered = await runOnce(true);
              if (recovered.length > 0) break;
            }
            if (recovered.length > 0) {
              emptyStreakRef.current = 0;
              setRoster((prev) => [...prev, ...recovered]);
            } else {
              exhaustedRef.current = true;
            }
          }
        }
      } catch (err) {
        console.error('[HomeView] getAllUsers failed:', err);
      } finally {
        loadingRef.current = false;
        if (reset) setIsLoadingRoster(false);
        else setIsLoadingMore(false);
      }
    },
    [],
  );

  // Gender change (or mount) starts a fresh shuffle from page 1.
  useEffect(() => {
    setRoster([]);
    scrollRef.current?.scrollTo({ top: 0 });
    void fetchPage(true, genderFilter);
  }, [genderFilter, fetchPage]);

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      void fetchPage(false, genderFilter);
    }
  };

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
          status: '',
          bio: u.bio ?? '',
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

  // Windowing: pages come from the API (take=50 + cursor), but only rows
  // near the viewport are mounted — the rest is a sized spacer.
  const rowVirtualizer = useVirtualizer({
    count: visibleUsers.length,
    getScrollElement: () => scrollRef.current,
    // Measured per row below; this is just the first-paint guess.
    estimateSize: () => 72,
    overscan: 6,
  });

  const renderGenderIcon = (gender?: string) => {
    const g = (gender || '').toLowerCase();
    if (g.includes('nam') || g === 'male') {
      return (
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-600 shrink-0" title="Nam">
          <Mars className="w-2.5 h-2.5" aria-hidden="true" />
        </span>
      );
    }
    if (g.includes('nữ') || g === 'female') {
      return (
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-pink-100 text-pink-600 shrink-0" title="Nữ">
          <Venus className="w-2.5 h-2.5" aria-hidden="true" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-purple-100 text-purple-600 shrink-0" title="Khác">
        <Transgender className="w-2.5 h-2.5" aria-hidden="true" />
      </span>
    );
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleListScroll}
      className="relative w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto no-scrollbar select-none"
    >
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
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Nearby Users List (virtualized — only viewport rows mount) */}
      <div className="p-3 max-w-lg mx-auto w-full pb-16">
        {visibleUsers.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
            {isLoadingRoster ? (
              <div className="py-8 flex justify-center">
                <LogoLoader size="md" text={null} />
              </div>
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
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const user = visibleUsers[virtualRow.index];
              if (!user) return null;
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="pb-2">
              <div
                onClick={() => setSelectedUser(user)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-100/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-2.5"
              >
                {/* Left: Avatar with presence dot */}
                <div className="relative shrink-0">
                  <Avatar
                    src={user.avatar}
                    name={user.name}
                    className="w-11 h-11 rounded-2xl object-cover ring-1 ring-slate-100 dark:ring-white/10 group-hover:ring-emerald-500 transition-all"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${
                      user.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                    title={user.isOnline ? 'Đang online' : 'Ngoại tuyến'}
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
                      <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                        <MapPin className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{formatDistance(user.distanceM)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Bio — single line with overflow ellipsis, fallback when empty */}
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate font-medium max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                    {user.bio?.trim() || 'Cốc cốc cốc mở cửa cho anh đê'}
                  </div>
                </div>

                {/* Right: Only Send Message Button */}
                <div className="shrink-0 pl-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => startGreetingChat(user)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                    title={`Nhắn tin cho ${user.name}`}
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>Nhắn</span>
                  </button>
                </div>
              </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isLoadingMore && (
          <div className="pb-2 flex justify-center">
            <LogoLoader size="sm" text={null} />
          </div>
        )}
      </div>

      {/* First-message modal (new 1:1 only) */}
      <FirstMessageModal
        target={greetingTarget}
        text={greetingText}
        onTextChange={setGreetingText}
        isSending={isSendingGreeting}
        onClose={closeGreeting}
        onSubmit={sendGreeting}
      />
    </div>
  );
};
