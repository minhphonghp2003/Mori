'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { setToastListener, TOASTS_ENABLED } from '../lib/toast';
import { 
  User, 
  Moment, 
  Conversation, 
  Timeline, 
  NavTab, 
  VisibilityTier, 
  ReactionEmoji, 
  FriendshipType,
  FriendshipStatus,
  Message
} from '../types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useAuth } from '@/providers/auth-provider';
import { getCurrentUser, updateCurrentUser, setAvatar } from '@/services/user';
import {
  getFeedMoments,
  getUserMoments,
  createMoment as createMomentApi,
  deleteMoment as deleteMomentApi,
  hideMoment as hideMomentApi,
  changeMomentVisibility as changeMomentVisibilityApi,
  addMomentReaction,
} from '@/services/moment';
import { getPresignedUploadUrls, uploadToPresignedUrl } from '@/services/upload';
import { isAxiosError } from 'axios';
import type { MomentVisibility } from '@/types/moment';
import { mapMoment, toReactionEmoji } from '@/lib/moment/mappers';
import {
  getMyFriendships,
  sendFriendRequest as sendFriendRequestApi,
  acceptFriendRequest,
  rejectFriendRequest,
  revokeFriendRequest,
  blockUser,
  unblockUser,
  removeFriendship,
  changeFriendshipType as changeFriendshipTypeApi,
} from '@/services/friendship';
import { FRIENDSHIP_TYPE_VALUES, isRemoved, type FriendshipDto } from '@/types/friendship';
import { appHub } from '@/lib/signalr/app-hub';
import { setMyStatus, setMyVisibility } from '@/store/slices/location-slice';
import { mapConversation, mapMessage, mapMeToUser, mapFriendshipToUser, dataUrlToBlob, emptyUser } from '@/lib/chat/mappers';
import {
  getMyTimelines,
  getUserTimelines,
  getTimelineById,
  createTimeline as createTimelineApi,
  deleteTimeline as deleteTimelineApi,
  getTimelineMomentsAll,
} from '@/services/timeline';
import { buildTimelineView, type TimelineOwnerLookup } from '@/lib/timeline/mappers';
import type { TimelineDto } from '@/types/timeline';
import type { MomentDto } from '@/types/moment';
import { useChatActions, type ChatActions } from '@/hooks/chat/use-chat-actions';
import { getCallController } from '@/lib/call/controller';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'error';
}

/** Media for a new moment: already-selected Files (converted from the
 *  camera/gallery sources by CreateMomentModal) — no bytes in the POST. */
export interface AddMomentInput {
  caption: string;
  images?: File[];
  video?: File;
  includeLocation?: boolean;
  allowComment?: boolean;
  visibility: VisibilityTier;
  excludedUserIds?: string[];
}

interface AppContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: User;
  friends: User[];
  moments: Moment[];
  momentsHasMore: boolean;
  isLoadingMoments: boolean;
  isLoadingMoreMoments: boolean;
  momentsError: boolean;
  processingMomentIds: string[];
  conversations: Conversation[];
  messagesMap: Record<string, Message[]>;
  conversationsHasMore: boolean;
  isLoadingConversations: boolean;
  isLoadingMoreConversations: boolean;
  totalUnreadCount: number;
  timelines: Timeline[];
  isLoadingTimelines: boolean;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  activeTimelineId: string | null;
  setActiveTimelineId: (id: string | null) => void;
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
  isNavHidden: boolean;
  setIsNavHidden: (hidden: boolean) => void;
  
  // Actions
  updateStatus: (newStatus: string) => void;
  updateVisibility: (tier: VisibilityTier) => void;
  updateBattery: (battery: number, isCharging?: boolean) => void;
  reactToMoment: (momentId: string, emoji: ReactionEmoji) => void;
  addMoment: (input: AddMomentInput) => Promise<void>;
  deleteMoment: (momentId: string) => void;
  hideMoment: (momentId: string) => void;
  changeMomentVisibility: (momentId: string, tier: VisibilityTier) => void;
  refreshMoments: () => Promise<void>;
  loadMoreMoments: () => Promise<void>;
  ensureUserMoments: (userId: string) => Promise<void>;
  refreshTimelines: () => Promise<void>;
  ensureUserTimelines: (userId: string) => Promise<void>;
  ensureTimelineById: (timelineId: string) => Promise<void>;
  sendMessage: ChatActions['sendMessage'];
  editMessage: ChatActions['editMessage'];
  deleteMessage: ChatActions['deleteMessage'];
  reactToMessage: ChatActions['reactToMessage'];
  createGroup: ChatActions['createGroup'];
  joinGroup: ChatActions['joinGroup'];
  startCall: (partner: User, isVideo: boolean) => void;
  endCall: () => void;
  toggleMuteCall: () => void;
  toggleCameraCall: () => void;
  respondFriendRequest: (userId: string, accept: boolean) => void;
  sendFriendRequest: (userId: string) => void;
  cancelFriendRequest: (userId: string) => void;
  changeFriendshipType: (userId: string, type: FriendshipType) => void;
  removeFriend: (userId: string) => void;
  blockFriend: (userId: string) => void;
  unblockFriend: (userId: string) => void;
  blockChat: ChatActions['blockChat'];
  unblockChat: ChatActions['unblockChat'];
  updateProfile: (profileData: Partial<Pick<User, 'name' | 'bio' | 'age' | 'gender' | 'avatar'>>) => Promise<void>;
  createTimeline: (timelineData: { title: string; partnerIds: string[]; selectedMomentIds: string[] }) => Promise<void>;
  deleteTimeline: (timelineId: string) => void;
  openChatWithUser: ChatActions['openChatWithUser'];
  toggleArchiveConversation: ChatActions['toggleArchiveConversation'];
  toggleMuteConversation: ChatActions['toggleMuteConversation'];
  deleteConversation: ChatActions['deleteConversation'];
  updateGroupInfo: ChatActions['updateGroupInfo'];
  addGroupMembers: ChatActions['addGroupMembers'];
  leaveGroup: ChatActions['leaveGroup'];
  refreshConversations: ChatActions['refreshConversations'];
  loadMoreConversations: ChatActions['loadMoreConversations'];
  loadOlderMessages: ChatActions['loadOlderMessages'];
  loadMessages: ChatActions['loadMessages'];
  hasMoreMessages: (conversationId: string) => boolean;
  resolvePartnerUser: ChatActions['resolvePartnerUser'];
  loadMembers: ChatActions['loadMembers'];
  openSearchWindow: ChatActions['openSearchWindow'];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const TAB_HREF: Record<NavTab, string> = {
  home: '/nearby',
  moments: '/moments',
  map: '/location',
  chat: '/chat',
  setting: '/settings',
};

const tabFromPathname = (path: string): NavTab => {
  if (path.startsWith('/nearby')) return 'home';
  if (path.startsWith('/moments')) return 'moments';
  if (path.startsWith('/location')) return 'map';
  if (path.startsWith('/chat')) return 'chat';
  if (path.startsWith('/settings') || path.startsWith('/timelines')) return 'setting';
  return 'map';
};

/** Main-app routes only — auth pages must never be recorded as last_page
 *  (AppProvider is mounted root-wide now). */
const isMainRoute = (path: string): boolean =>
  Object.values(TAB_HREF).some((href) => path === href || path.startsWith(`${href}/`)) ||
  path.startsWith('/timelines');

/** Match a presigned upload key against a ReceiveFileMarkedSuccess key by
 *  folder prefix (strip the filename): `users/1/images/<guid>/raw.jpg` vs
 *  `users/1/images/<guid>/original.webp` → both `users/1/images/<guid>`. */
const normalizeFileKeyToken = (key: string | undefined): string => {
  if (!key) return '';
  const idx = key.lastIndexOf('/');
  return idx > 0 ? key.slice(0, idx) : key;
};

const VISIBILITY_NAMES: MomentVisibility[] = ['OnlyMe', 'Friends', 'BestFriend', 'Lover', 'Public'];
const VISIBILITY_LABELS = ['Chỉ mình tôi', 'Bạn bè', 'Bạn thân', 'Người yêu', 'Công khai'];

/** Neutral pre-hydration identity — replaced by GET /User/me on login. */
const INITIAL_CURRENT_USER: User = {
  ...emptyUser('', '', ''),
  bio: '',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_CURRENT_USER);
  const [friendships, setFriendships] = useState<FriendshipDto[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [momentsHasMore, setMomentsHasMore] = useState(false);
  const [isLoadingMoments, setIsLoadingMoments] = useState(false);
  const [isLoadingMoreMoments, setIsLoadingMoreMoments] = useState(false);
  const [momentsError, setMomentsError] = useState(false);
  const [processingMomentIds, setProcessingMomentIds] = useState<string[]>([]);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [isLoadingTimelines, setIsLoadingTimelines] = useState(false);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isNavHidden, setIsNavHidden] = useState<boolean>(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const chatState = useAppSelector((s) => s.chat);

  // Raw friendship rows stay in state; the design-shaped `friends` list is
  // derived so every consumer (map, settings, group picker) sees live state.
  const friendshipsRef = useRef(friendships);
  useEffect(() => {
    friendshipsRef.current = friendships;
  }, [friendships]);

  // ---- Moments feed internals -------------------------------------------
  const momentsRef = useRef(moments);
  useEffect(() => {
    momentsRef.current = moments;
  }, [moments]);
  const momentsCursorRef = useRef<number | null>(null);
  /** momentId -> presigned keys still awaiting ReceiveFileMarkedSuccess. */
  const processingMapRef = useRef<Map<string, string[]>>(new Map());
  const markedFileKeysRef = useRef<Set<string>>(new Set());
  /** Reaction send queues (server rate-limits to 1 POST/sec per user+moment). */
  const reactionQueuesRef = useRef<Map<string, { queue: ReactionEmoji[]; timer: number | null; inFlight: boolean }>>(new Map());
  /** Self-reference for the recursive queue pump (ref writes only in effects). */
  const pumpReactionsRef = useRef<(momentId: string) => Promise<void>>(async () => {});

  // ---- Timelines internals ---------------------------------------------
  /** Raw DTO+moments cache so owner-name changes re-map without refetching. */
  const timelineCacheRef = useRef<Array<{ dto: TimelineDto; momentDtos: MomentDto[] }>>([]);
  const applyTimelinesRef = useRef<() => void>(() => {});

  const myNumericId = auth.user?.id;
  const friends = useMemo(() => {
    if (!myNumericId) return [];
    return friendships
      .filter((f) => !isRemoved(f))
      .map((f) => mapFriendshipToUser(f, myNumericId));
  }, [friendships, myNumericId]);

  // Active tab is derived from the current route (single source of truth)
  const activeTab = tabFromPathname(pathname);

  // Navigate to a tab's route (nav bar restores itself via derived state)
  const handleSetActiveTab = (tab: NavTab) => {
    setIsNavHidden(false);
    const href = TAB_HREF[tab];
    if (pathname !== href) router.push(href);
  };

  // Persist last main page for the "/" redirector
  useEffect(() => {
    if (!isMainRoute(pathname)) return;
    if (!pathname.startsWith('/chat/')) {
      localStorage.setItem('last_page', pathname);
    }
  }, [pathname]);

  // Toast helper — stable identity so it can also back the module-level
  // bridge (lib/toast) used by axios/signalr code outside React.
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (text: string, type: 'success' | 'info' | 'error' = 'info') => {
      if (!TOASTS_ENABLED) return;
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      setToasts(prev => [...prev, { id, text, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 3200);
    },
    [removeToast],
  );

  useEffect(() => {
    setToastListener(showToast);
    return () => setToastListener(null);
  }, [showToast]);

  // ---------------------------------------------------------------------
  // Chat state — DTOs live in Redux; design-shaped objects are derived.
  // ---------------------------------------------------------------------
  const editedIds = useMemo(
    () => new Set(chatState.editedMessageIds),
    [chatState.editedMessageIds],
  );

  const conversations = useMemo(
    () => chatState.conversations.map((c) => mapConversation(c, { editedIds })),
    [chatState.conversations, editedIds],
  );

  const messagesMap = useMemo(() => {
    const out: Record<string, Message[]> = {};
    for (const key of Object.keys(chatState.messages)) {
      const list = chatState.messages[Number(key)] ?? [];
      out[key] = list.map((m) => mapMessage(m, { editedIds }));
    }
    return out;
  }, [chatState.messages, editedIds]);

  const chatActions = useChatActions({
    toast: showToast,
    setSelectedUser,
    revealNav: () => setIsNavHidden(false),
  });

  const {
    refreshConversations,
    enterConversation,
    leaveConversation,
  } = chatActions;

  // Real profile identity (isMe checks depend on currentUser.id being correct
  // as soon as the session hydrates; the full profile lands right after).
  useEffect(() => {
    if (!auth.hydrated || !auth.user) return;
    const uid = String(auth.user.id);
    const authName = auth.user.name;
    let cancelled = false;
    setCurrentUser((prev) =>
      prev.id === uid ? prev : { ...prev, id: uid, name: authName || prev.name },
    );
    (async () => {
      try {
        const me = await getCurrentUser();
        if (!cancelled) setCurrentUser(mapMeToUser(me));
      } catch (err) {
        console.error('[AppContext] getCurrentUser failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.hydrated, auth.user?.id, auth.user?.name]);

  // Real friendship graph (accepted + pending + blocked rows for the
  // settings/profile surfaces; group creation filters accepted).
  const refreshFriendships = useCallback(async () => {
    try {
      const res = await getMyFriendships({ take: 100 });
      setFriendships(res.data.filter((f) => !isRemoved(f)));
    } catch (err) {
      console.error('[AppContext] getMyFriendships failed:', err);
    }
  }, []);

  useEffect(() => {
    if (!auth.hydrated || !myNumericId) return;
    void refreshFriendships();
  }, [auth.hydrated, myNumericId, refreshFriendships]);

  // ---------------------------------------------------------------------
  // Moments feed — first page on login, cursor paging, focus refetch.
  // ---------------------------------------------------------------------
  const refreshMoments = useCallback(async () => {
    setIsLoadingMoments(true);
    setMomentsError(false);
    try {
      const page = await getFeedMoments(null, 10);
      momentsCursorRef.current = page.prevId;
      setMomentsHasMore(page.hasMore);
      setMoments(page.data.map(mapMoment));
    } catch (err) {
      console.error('[AppContext] getFeedMoments failed:', err);
      setMomentsError(true);
    } finally {
      setIsLoadingMoments(false);
    }
  }, []);

  const loadMoreMoments = useCallback(async () => {
    if (isLoadingMoreMoments || !momentsHasMore) return;
    setIsLoadingMoreMoments(true);
    try {
      const page = await getFeedMoments(momentsCursorRef.current, 10);
      momentsCursorRef.current = page.prevId;
      setMomentsHasMore(page.hasMore);
      setMoments((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...page.data.map(mapMoment).filter((m) => !ids.has(m.id))];
      });
    } catch (err) {
      console.error('[AppContext] loadMoreMoments failed:', err);
      setMomentsError(true);
    } finally {
      setIsLoadingMoreMoments(false);
    }
  }, [isLoadingMoreMoments, momentsHasMore]);

  /** A user's visible moments merged into the feed list (profile grids). */
  const ensureUserMoments = useCallback(async (userId: string) => {
    const uid = Number(userId);
    if (!uid) return;
    try {
      const page = await getUserMoments(uid, null, 12);
      const mapped = page.data.map(mapMoment);
      setMoments((prev) => {
        const rest = prev.filter((m) => m.userId !== String(uid));
        const existing = new Set(rest.map((m) => m.id));
        return [...mapped.filter((m) => !existing.has(m.id)), ...rest];
      });
    } catch (err) {
      console.error('[AppContext] getUserMoments failed:', err);
    }
  }, []);

  // ---------------------------------------------------------------------
  // Timelines — API-backed (/Timeline/me cursor) enriched with each
  // timeline's moments so cards/detail get banner + dates + journey stops.
  // ---------------------------------------------------------------------
  const timelineOwnerCtx = useMemo<TimelineOwnerLookup>(() => ({
    myId: myNumericId ? String(myNumericId) : '',
    findUser: (id: string) => {
      if (id && myNumericId && String(myNumericId) === id) {
        return { name: currentUser.name, avatar: currentUser.avatar };
      }
      const f = friends.find((u) => u.id === id);
      return f ? { name: f.name, avatar: f.avatar } : undefined;
    },
  }), [myNumericId, currentUser.name, currentUser.avatar, friends]);

  const applyTimelinesFromCache = useCallback(() => {
    setTimelines(
      timelineCacheRef.current.map(({ dto, momentDtos }) =>
        buildTimelineView(dto, momentDtos, timelineOwnerCtx),
      ),
    );
  }, [timelineOwnerCtx]);

  useEffect(() => {
    applyTimelinesRef.current = applyTimelinesFromCache;
  }, [applyTimelinesFromCache]);

  // Profile/friends landing after the first load → re-map owner names
  // from the cache without refetching anything.
  useEffect(() => {
    if (timelineCacheRef.current.length) applyTimelinesFromCache();
  }, [applyTimelinesFromCache]);

  /** Fetch each timeline's moments (best-effort; empty on failure). */
  const enrichTimelineCaches = useCallback(async (dtos: TimelineDto[]) => {
    return Promise.all(
      dtos.map(async (dto) => {
        let momentDtos: MomentDto[] = [];
        try {
          momentDtos = await getTimelineMomentsAll(Number(dto.id));
        } catch (err) {
          console.error('[AppContext] getTimelineMoments failed:', err);
        }
        return { dto, momentDtos };
      }),
    );
  }, []);

  const refreshTimelines = useCallback(async () => {
    setIsLoadingTimelines(true);
    try {
      const page = await getMyTimelines(null, 20);
      timelineCacheRef.current = await enrichTimelineCaches(page.data);
      applyTimelinesRef.current();
    } catch (err) {
      console.error('[AppContext] getMyTimelines failed:', err);
    } finally {
      setIsLoadingTimelines(false);
    }
  }, [enrichTimelineCaches]);

  /** A user's timelines merged into the list (profile sheet tab). */
  const ensureUserTimelines = useCallback(async (userId: string) => {
    const uid = Number(userId);
    if (!uid) return;
    try {
      const page = await getUserTimelines(uid, null, 20);
      if (!page.data.length) return;
      const fetched = await enrichTimelineCaches(page.data);
      const fetchedIds = new Set(fetched.map((r) => String(r.dto.id)));
      timelineCacheRef.current = [
        ...fetched,
        ...timelineCacheRef.current.filter((r) => !fetchedIds.has(String(r.dto.id))),
      ];
      applyTimelinesRef.current();
    } catch (err) {
      console.error('[AppContext] getUserTimelines failed:', err);
    }
  }, [enrichTimelineCaches]);

  /** On-demand fetch for a moment's timeline chip when it isn't loaded yet. */
  const ensureTimelineById = useCallback(async (timelineId: string) => {
    const tid = Number(timelineId);
    if (!tid) return;
    if (timelineCacheRef.current.some((r) => String(r.dto.id) === String(tid))) return;
    try {
      const res = await getTimelineById(tid);
      if (!res.data) return;
      const rows = await enrichTimelineCaches([res.data]);
      timelineCacheRef.current = [...rows, ...timelineCacheRef.current];
      applyTimelinesRef.current();
    } catch (err) {
      console.error('[AppContext] getTimelineById failed:', err);
    }
  }, [enrichTimelineCaches]);

  const findFriendshipRow = (userId: string): FriendshipDto | undefined => {
    const my = auth.user?.id;
    const oid = Number(userId);
    if (!my) return undefined;
    return friendshipsRef.current.find(
      (f) => (f.user1Id === my && f.user2Id === oid) || (f.user1Id === oid && f.user2Id === my),
    );
  };

  const upsertFriendship = useCallback((dto: FriendshipDto) => {
    setFriendships((prev) => {
      const rest = prev.filter((x) => x.id !== dto.id);
      return isRemoved(dto) ? rest : [...rest, dto];
    });
  }, []);

  const dropFriendship = useCallback((id: number) => {
    setFriendships((prev) => prev.filter((x) => x.id !== id));
  }, []);

  /** Relationship of `dto` as seen by me, in the design shape. */
  const relationshipFromDto = (
    dto: FriendshipDto,
  ): { type: FriendshipType; status: FriendshipStatus } | undefined => {
    const my = auth.user?.id;
    if (!my) return undefined;
    return mapFriendshipToUser(dto, my).relationship;
  };

  /** Keep the open profile sheet in sync (strangers aren't in `friends`). */
  const syncSelectedRelationship = (
    userId: string,
    relationship?: { type: FriendshipType; status: FriendshipStatus },
  ) => {
    setSelectedUser((prev) => (prev && prev.id === userId ? { ...prev, relationship } : prev));
  };

  /** Axios already toasts; here we only log and re-sync (400 = someone beat us to it). */
  const onFriendshipError = (label: string, err: unknown) => {
    console.error(`[AppContext] ${label} failed:`, err);
    void refreshFriendships();
  };

  // Realtime friendship + moment changes broadcast by the hub (multi-slot
  // subscriptions; cleared on appHub.stop()).
  const handleFileMarkedSuccess = useCallback((data: { originalKey?: string; key?: string; fileId?: string }) => {
    const raw = data.originalKey ?? data.key ?? data.fileId;
    if (!raw) return;
    markedFileKeysRef.current.add(normalizeFileKeyToken(raw));
    const resolved: string[] = [];
    processingMapRef.current.forEach((keys, mid) => {
      const remaining = keys.filter((k) => !markedFileKeysRef.current.has(k));
      if (remaining.length === 0) resolved.push(mid);
      else processingMapRef.current.set(mid, remaining);
    });
    resolved.forEach((mid) => {
      processingMapRef.current.delete(mid);
    });
    // POST /Moment answers with a transient id-0 placeholder row — the real
    // moment (real id, Success status) only exists after processing, so swap
    // the whole page for fresh server ids instead of refetching one row.
    if (resolved.length > 0) {
      setProcessingMomentIds([...processingMapRef.current.keys()]);
      void refreshMoments();
    }
  }, [refreshMoments]);

  useEffect(() => {
    if (!auth.hydrated || !auth.isAuthenticated || !myNumericId) return;
    const unsubs = [
      appHub.onReceiveFriendshipCreated(upsertFriendship),
      appHub.onReceiveFriendshipAccepted(upsertFriendship),
      appHub.onReceiveFriendshipBlocked(upsertFriendship),
      appHub.onReceiveFriendshipUnblocked(upsertFriendship),
      appHub.onReceiveMomentReacted((data) => {
        setMoments((prev) =>
          prev.map((m) => {
            if (m.id !== String(data.momentId)) return m;
            const uid = String(data.userId);
            if (m.reactions.some((r) => r.userId === uid && r.emoji === data.emoji)) return m;
            return {
              ...m,
              reactions: [
                ...m.reactions,
                {
                  userId: uid,
                  userName: data.userName,
                  userAvatar: data.userImage?.thumbUrl ?? '',
                  emoji: toReactionEmoji(data.emoji),
                },
              ],
            };
          }),
        );
      }),
      appHub.onReceiveFileMarkedSuccess(handleFileMarkedSuccess),
    ];
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [auth.hydrated, auth.isAuthenticated, myNumericId, upsertFriendship, handleFileMarkedSuccess]);

  // Conversation list: first page on login + refetch when the tab regains
  // focus (rows go stale otherwise — API doc §19 recommends a refetch).
  const authReady = auth.hydrated && auth.isAuthenticated && !!auth.user;
  useEffect(() => {
    if (!authReady) return;
    let alive = true;
    setIsLoadingConversations(true);
    refreshConversations().finally(() => {
      if (alive) setIsLoadingConversations(false);
    });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshConversations();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authReady, auth.user?.id, refreshConversations]);

  // Drop the previous user's social state the moment the session ends
  // (AppProvider is root-mounted and survives logout → /init).
  useEffect(() => {
    if (auth.hydrated && !auth.isAuthenticated) {
      setFriendships([]);
      setMoments([]);
      setMomentsHasMore(false);
      setMomentsError(false);
      setProcessingMomentIds([]);
      processingMapRef.current.clear();
      markedFileKeysRef.current.clear();
      reactionQueuesRef.current.clear();
      momentsCursorRef.current = null;
      setTimelines([]);
      timelineCacheRef.current = [];
    }
  }, [auth.hydrated, auth.isAuthenticated]);

  // Moments feed + timelines: first page on login + refetch when the tab
  // regains focus.
  useEffect(() => {
    if (!authReady) return;
    void refreshMoments();
    void refreshTimelines();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshMoments();
        void refreshTimelines();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [authReady, auth.user?.id, refreshMoments, refreshTimelines]);

  // Enter/leave wrapper: page components keep calling
  // setActiveConversationId, which now drives the SignalR room join and the
  // message window.
  const handleSetActiveConversationId = useCallback(
    (id: string | null) => {
      setActiveConversationId(id);
      if (id) void enterConversation(id);
      else void leaveConversation();
    },
    [enterConversation, leaveConversation],
  );

  const hasMoreMessages = useCallback(
    (conversationId: string) => !!chatState.messageHasMore[Number(conversationId)],
    [chatState.messageHasMore],
  );

  // Profile / Status actions — pushed to the hub so other map users see them.
  // The local state + toast only land after the server confirms; a dropped
  // hub must never look like a saved status.
  const updateStatus = (newStatus: string) => {
    const trimmed = newStatus.slice(0, 45);
    void (async () => {
      try {
        await appHub.updateStatus(trimmed);
        dispatch(setMyStatus(trimmed));
        setCurrentUser(prev => ({ ...prev, status: trimmed, lastUpdated: 'Vừa xong' }));
        showToast('Đã cập nhật trạng thái mới ✨', 'success');
      } catch (err) {
        console.error('[AppContext] updateStatus failed:', err);
        showToast('Mất kết nối, chưa cập nhật được trạng thái', 'error');
      }
    })();
  };

  const updateVisibility = (tier: VisibilityTier) => {
    void (async () => {
      try {
        await appHub.updateVisibility(tier);
        dispatch(setMyVisibility(tier));
        setCurrentUser(prev => ({ ...prev, visibility: tier }));
        const labels = ['Chỉ mình tôi', 'Bạn bè', 'Bạn thân', 'Người yêu', 'Công khai'];
        showToast(`Đã đổi quyền riêng tư vị trí: ${labels[tier]} 📍`, 'success');
      } catch (err) {
        console.error('[AppContext] updateVisibility failed:', err);
        showToast('Mất kết nối, chưa đổi được quyền riêng tư', 'error');
      }
    })();
  };

  const updateBattery = (battery: number, isCharging = false) => {
    setCurrentUser(prev => ({ ...prev, battery, isCharging }));
    showToast(`Cập nhật mức pin: ${battery}%`, 'info');
  };

  // ---------------------------------------------------------------------
  // Moments actions — feed rows are API-backed. Reactions are add-only
  // upstream (unique moment+user+emoji, no DELETE endpoint), so optimistic
  // state mirrors that: duplicates are no-ops, never optimistic-off.
  // ---------------------------------------------------------------------
  const dropOptimisticReaction = useCallback((momentId: string, emoji: ReactionEmoji) => {
    const my = auth.user ? String(auth.user.id) : '';
    setMoments((prev) =>
      prev.map((m) =>
        m.id === momentId
          ? { ...m, reactions: m.reactions.filter((r) => !(r.userId === my && r.emoji === emoji)) }
          : m,
      ),
    );
  }, [auth.user]);

  // Sequential sender: server rate-limits reactions to 1 req/sec per
  // user+moment (rejected calls come back as an empty 200), so queued taps
  // are flushed one-by-one with a 1.05 s gap.
  const pumpReactions = useCallback(async (momentId: string) => {
    const entry = reactionQueuesRef.current.get(momentId);
    if (!entry || entry.inFlight) return;
    if (entry.queue.length === 0) {
      reactionQueuesRef.current.delete(momentId);
      return;
    }
    entry.inFlight = true;
    const emoji = entry.queue.shift()!;
    try {
      await addMomentReaction(Number(momentId), emoji);
    } catch (err) {
      // axios already toasted; drop the optimistic row so state matches.
      console.error('[AppContext] addMomentReaction failed:', err);
      dropOptimisticReaction(momentId, emoji);
    } finally {
      entry.inFlight = false;
      if (entry.queue.length > 0) {
        entry.timer = window.setTimeout(() => {
          entry.timer = null;
          void pumpReactionsRef.current(momentId);
        }, 1050);
      } else {
        reactionQueuesRef.current.delete(momentId);
      }
    }
  }, [dropOptimisticReaction]);

  useEffect(() => {
    pumpReactionsRef.current = pumpReactions;
  }, [pumpReactions]);

  const reactToMoment = (momentId: string, emoji: ReactionEmoji) => {
    const my = currentUser.id;
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        if (m.reactions.some((r) => r.userId === my && r.emoji === emoji)) return m;
        return {
          ...m,
          reactions: [
            ...m.reactions,
            { userId: my, userName: currentUser.name, userAvatar: currentUser.avatar, emoji },
          ],
        };
      }),
    );

    const alreadyOnServer = momentsRef.current
      .find((m) => m.id === momentId)
      ?.reactions.some((r) => r.userId === my && r.emoji === emoji);
    if (alreadyOnServer) return;

    let entry = reactionQueuesRef.current.get(momentId);
    if (!entry) {
      entry = { queue: [], timer: null, inFlight: false };
      reactionQueuesRef.current.set(momentId, entry);
    }
    if (entry.queue.includes(emoji)) return;
    entry.queue.push(emoji);
    if (entry.timer == null && !entry.inFlight) {
      entry.timer = window.setTimeout(() => {
        entry.timer = null;
        void pumpReactionsRef.current(momentId);
      }, 1000);
    }
  };

  /** presigned `Moment` upload → POST /Moment → prepend to the feed. */
  const addMoment = async (input: AddMomentInput): Promise<void> => {
    const files = input.images?.length ? input.images : input.video ? [input.video] : [];
    if (files.length === 0) {
      showToast('Không có ảnh hoặc video nào để đăng.', 'error');
      throw new Error('no media');
    }
    const contentTypes = files.map((f) => f.type || 'application/octet-stream');
    try {
      const presigned = await getPresignedUploadUrls({ bucket: 'Moment', contentTypes });
      await Promise.all(
        presigned.map((item, i) => uploadToPresignedUrl(item.uploadUrl, files[i], contentTypes[i])),
      );
      const isVideo = input.video != null;
      const dto = await createMomentApi({
        caption: input.caption || undefined,
        visibility: input.visibility,
        allowComment: input.allowComment !== false,
        isShowLocation: input.includeLocation !== false,
        excludedUserIds: input.excludedUserIds?.length ? input.excludedUserIds.join(',') : null,
        imageFileIds: isVideo ? null : presigned.map((p) => p.fileId),
        videoFileId: isVideo ? (presigned[0]?.fileId ?? null) : null,
      });
      const mapped = mapMoment(dto);
      // The create response carries a transient id-0 placeholder (the real
      // id only exists after processing) — repeated creates must not eat
      // each other's placeholder rows.
      setMoments((prev) => [mapped, ...prev.filter((m) => m.id !== mapped.id || mapped.id === '0')]);
      if (dto.status === 'Processing') {
        const marked = markedFileKeysRef.current;
        const remaining = presigned
          .map((p) => normalizeFileKeyToken(p.key))
          .filter((k) => k && !marked.has(k));
        if (remaining.length > 0) {
          processingMapRef.current.set(mapped.id, remaining);
          setProcessingMomentIds([...processingMapRef.current.keys()]);
          // Safety net: if the hub event never arrives, the placeholder
          // must not sit with a stuck pill forever.
          setTimeout(() => {
            const stillWaiting = [...processingMapRef.current.keys()];
            if (stillWaiting.length > 0) {
              processingMapRef.current.clear();
              setProcessingMomentIds([]);
              void refreshMoments();
            }
          }, 45000);
        }
      }
      showToast('Đã đăng khoảnh khắc mới thành công! 📸', 'success');
    } catch (err) {
      console.error('[AppContext] addMoment failed:', err);
      if (!isAxiosError(err)) {
        showToast(err instanceof Error ? err.message : 'Đăng khoảnh khắc thất bại.', 'error');
      }
      throw err;
    }
  };

  /** API call first; the ReelCard shows its own success toast/close. */
  const deleteMoment = (momentId: string) => {
    const numericId = Number(momentId);
    if (!numericId) return;
    void (async () => {
      try {
        await deleteMomentApi(numericId);
        setMoments((prev) => prev.filter((m) => m.id !== momentId));
      } catch (err) {
        console.error('[AppContext] deleteMoment failed:', err);
        void refreshMoments();
      }
    })();
  };

  /** Hide someone else's moment from my feed (server keeps no undo). */
  const hideMoment = (momentId: string) => {
    const numericId = Number(momentId);
    if (!numericId) return;
    void (async () => {
      try {
        await hideMomentApi(numericId);
        setMoments((prev) => prev.filter((m) => m.id !== momentId));
        showToast('Đã ẩn khoảnh khắc khỏi feed của bạn', 'info');
      } catch (err) {
        console.error('[AppContext] hideMoment failed:', err);
      }
    })();
  };

  // Fire-and-forget: patch visibility locally and sync to the server in
  // the background. The returned DTO is ignored and the list is never
  // refetched — visibility only.
  const changeMomentVisibility = (momentId: string, tier: VisibilityTier) => {
    const numericId = Number(momentId);
    if (!numericId || tier < 0 || tier > 4) return;
    setMoments((prev) => prev.map((m) => (m.id === momentId ? { ...m, visibility: tier } : m)));
    showToast(`Đã đổi quyền xem: ${VISIBILITY_LABELS[tier]} 🔒`, 'success');
    void changeMomentVisibilityApi(numericId, VISIBILITY_NAMES[tier]).catch((err) => {
      console.error('[AppContext] changeMomentVisibility failed:', err);
    });
  };

  // Calling actions — delegated to the CallProvider (real WebRTC) mounted
  // under (main)/layout. AppProvider is root-mounted so it reaches the
  // provider through the controller bridge instead of useCall().
  const startCall = (partner: User, isVideo: boolean) => {
    const controller = getCallController();
    if (!controller) {
      showToast('Không thể gọi lúc này, vui lòng thử lại', 'error');
      return;
    }
    controller.startCall(Number(partner.id), partner.name, partner.avatar || null, isVideo);
  };

  const endCall = () => {
    getCallController()?.endCall();
  };

  const toggleMuteCall = () => {
    getCallController()?.toggleMic();
  };

  const toggleCameraCall = () => {
    getCallController()?.toggleCamera();
  };

  // Friends & Social Graph actions — backed by /Friendship endpoints.
  // Lock contention (409) is retried by the axios interceptor; a 400 here
  // means the relationship changed server-side, so we re-fetch the list.
  const respondFriendRequest = (userId: string, accept: boolean) => {
    const row = findFriendshipRow(userId);
    if (!row) {
      void refreshFriendships();
      return;
    }
    const name = row.otherUserName || 'Bạn';
    void (async () => {
      try {
        if (accept) {
          const dto = await acceptFriendRequest(row.id);
          upsertFriendship(dto);
          syncSelectedRelationship(userId, relationshipFromDto(dto));
          showToast(`Đã kết bạn với ${name} 🤝`, 'success');
        } else {
          await rejectFriendRequest(row.id);
          dropFriendship(row.id);
          syncSelectedRelationship(userId, undefined);
          showToast(`Đã từ chối lời mời từ ${name}`, 'info');
        }
      } catch (err) {
        onFriendshipError('respondFriendRequest', err);
      }
    })();
  };

  const sendFriendRequest = (userId: string) => {
    void (async () => {
      try {
        const dto = await sendFriendRequestApi(Number(userId));
        upsertFriendship(dto);
        const rel = relationshipFromDto(dto);
        syncSelectedRelationship(userId, rel);
        showToast(
          rel?.status === 'accepted'
            ? `Đã kết bạn với ${dto.otherUserName} 🤝`
            : 'Đã gửi lời mời kết bạn ✨',
          'success',
        );
      } catch (err) {
        onFriendshipError('sendFriendRequest', err);
      }
    })();
  };

  const cancelFriendRequest = (userId: string) => {
    const row = findFriendshipRow(userId);
    if (!row) {
      void refreshFriendships();
      return;
    }
    void (async () => {
      try {
        await revokeFriendRequest(row.id);
        dropFriendship(row.id);
        syncSelectedRelationship(userId, undefined);
        showToast('Đã thu hồi lời mời kết bạn', 'info');
      } catch (err) {
        onFriendshipError('cancelFriendRequest', err);
      }
    })();
  };

  const changeFriendshipType = (userId: string, type: FriendshipType) => {
    const row = findFriendshipRow(userId);
    if (!row) {
      void refreshFriendships();
      return;
    }
    const apiType =
      type === 'best_friend'
        ? FRIENDSHIP_TYPE_VALUES.BestFriend
        : type === 'lover'
          ? FRIENDSHIP_TYPE_VALUES.Lover
          : FRIENDSHIP_TYPE_VALUES.Friend;
    void (async () => {
      try {
        const dto = await changeFriendshipTypeApi(row.id, apiType);
        upsertFriendship(dto);
        syncSelectedRelationship(userId, relationshipFromDto(dto));
        const typeLabels: Record<FriendshipType, string> = {
          friend: 'Bạn bè',
          best_friend: 'Bạn thân ⭐',
          lover: 'Người yêu ❤️'
        };
        showToast(`Đã cập nhật quan hệ: ${typeLabels[type]}`, 'success');
      } catch (err) {
        onFriendshipError('changeFriendshipType', err);
      }
    })();
  };

  const removeFriend = (userId: string) => {
    const row = findFriendshipRow(userId);
    if (!row) {
      void refreshFriendships();
      return;
    }
    const name = row.otherUserName || 'Bạn bè';
    void (async () => {
      try {
        await removeFriendship(row.id);
        dropFriendship(row.id);
        syncSelectedRelationship(userId, undefined);
        showToast(`Đã hủy kết bạn với ${name}`, 'info');
      } catch (err) {
        onFriendshipError('removeFriend', err);
      }
    })();
  };

  const blockFriend = (userId: string) => {
    const row = findFriendshipRow(userId);
    if (!row) {
      void refreshFriendships();
      return;
    }
    const name = row.otherUserName || 'Người dùng';
    void (async () => {
      try {
        const dto = await blockUser(row.id);
        upsertFriendship(dto);
        syncSelectedRelationship(userId, relationshipFromDto(dto));
        showToast(`Đã chặn ${name} 🚫`, 'info');
      } catch (err) {
        onFriendshipError('blockFriend', err);
      }
    })();
  };

  const unblockFriend = (userId: string) => {
    const row = findFriendshipRow(userId);
    if (!row) {
      void refreshFriendships();
      return;
    }
    const name = row.otherUserName || 'Người dùng';
    void (async () => {
      try {
        const dto = await unblockUser(row.id);
        upsertFriendship(dto);
        syncSelectedRelationship(userId, relationshipFromDto(dto));
        showToast(`Đã bỏ chặn ${name} 🤝`, 'success');
      } catch (err) {
        onFriendshipError('unblockFriend', err);
      }
    })();
  };

  /**
   * Profile save: avatar (if a new data-URL was picked) goes through the
   * presigned Profile bucket → POST /User/me/avatar; name/age/gender/bio
   * through PUT /User/me. Axios errors are toasted by the interceptor; thrown
   * so the modal stays open on failure.
   */
  const updateProfile = async (
    profileData: Partial<Pick<User, 'name' | 'bio' | 'age' | 'gender' | 'avatar'>>,
  ): Promise<void> => {
    let avatar = currentUser.avatar;
    try {
      if (profileData.avatar && profileData.avatar !== currentUser.avatar) {
        if (profileData.avatar.startsWith('data:')) {
          const blob = dataUrlToBlob(profileData.avatar);
          const contentType = blob.type || 'image/jpeg';
          const [item] = await getPresignedUploadUrls({
            bucket: 'Profile',
            contentTypes: [contentType],
          });
          if (!item) throw new Error('Không nhận được URL tải lên.');
          await uploadToPresignedUrl(item.uploadUrl, blob, contentType);
          await setAvatar(item.fileId);
        }
        avatar = profileData.avatar;
      }

      const genderId =
        profileData.gender === 'Nam' ? 1 : profileData.gender === 'Nữ' ? 2 : profileData.gender ? 3 : undefined;
      const dto = await updateCurrentUser({
        name: (profileData.name ?? currentUser.name).trim(),
        age: Number(profileData.age ?? currentUser.age) || currentUser.age || 20,
        ...(genderId ? { genderId } : {}),
        ...(profileData.bio !== undefined ? { bio: profileData.bio.trim() } : {}),
      });
      const mapped = mapMeToUser(dto);
      setCurrentUser((prev) => ({
        ...prev,
        name: mapped.name,
        age: mapped.age,
        gender: mapped.gender,
        // Server avatar wins (fresh just-uploaded URL); the picked
        // data-URL only survives when the profile has no server image yet.
        avatar: mapped.avatar || avatar,
        bio: mapped.bio ?? (profileData.bio !== undefined ? profileData.bio : prev.bio),
        lastUpdated: 'Vừa xong',
      }));
      showToast('Đã lưu thông tin cá nhân thành công ✨', 'success');
    } catch (err) {
      if (!isAxiosError(err)) {
        showToast(err instanceof Error ? err.message : 'Không thể lưu hồ sơ.', 'error');
      }
      throw err;
    }
  };

  // Timelines actions — API-backed. Design title → API `caption` (≤2000);
  // description/banner/dates are not API fields (adaptation table): dates
  // only scope the available-moments picker, banner derives from moments.
  const createTimeline = async (data: {
    title: string;
    partnerIds: string[];
    selectedMomentIds: string[];
  }) => {
    try {
      await createTimelineApi({
        caption: data.title.trim().slice(0, 2000),
        partnerIds: data.partnerIds.map(Number).filter((n) => n > 0),
        momentIds: data.selectedMomentIds.map(Number).filter((n) => n > 0),
      });
      await refreshTimelines();
      showToast(`Đã tạo hành trình "${data.title.trim()}" 🧭`, 'success');
    } catch (err) {
      console.error('[AppContext] createTimeline failed:', err);
      throw err;
    }
  };

  const deleteTimeline = (timelineId: string) => {
    const target = timelines.find(t => t.id === timelineId);
    void (async () => {
      try {
        await deleteTimelineApi(Number(timelineId));
        timelineCacheRef.current = timelineCacheRef.current.filter(
          (r) => String(r.dto.id) !== timelineId,
        );
        setTimelines(prev => prev.filter(t => t.id !== timelineId));
        if (activeTimelineId === timelineId) {
          setActiveTimelineId(null);
        }
        showToast(`Đã xóa hành trình "${target?.title || ''}" 🗑️`, 'info');
      } catch (err) {
        console.error('[AppContext] deleteTimeline failed:', err);
      }
    })();
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab: handleSetActiveTab,
        isNavHidden,
        setIsNavHidden,
        currentUser,
        friends,
        moments,
        momentsHasMore,
        isLoadingMoments,
        isLoadingMoreMoments,
        momentsError,
        processingMomentIds,
        conversations,
        messagesMap,
        conversationsHasMore: chatState.conversationsHasMore,
        isLoadingConversations,
        isLoadingMoreConversations: chatActions.isLoadingMore,
        totalUnreadCount: chatState.totalUnreadCount,
        timelines,
        isLoadingTimelines,
        activeConversationId,
        setActiveConversationId: handleSetActiveConversationId,
        activeTimelineId,
        setActiveTimelineId,
        selectedUser,
        setSelectedUser,
        toasts,
        showToast,
        removeToast,
        updateStatus,
        updateVisibility,
        updateBattery,
        reactToMoment,
        addMoment,
        deleteMoment,
        hideMoment,
        changeMomentVisibility,
        refreshMoments,
        loadMoreMoments,
        ensureUserMoments,
        refreshTimelines,
        ensureUserTimelines,
        ensureTimelineById,
        sendMessage: chatActions.sendMessage,
        editMessage: chatActions.editMessage,
        deleteMessage: chatActions.deleteMessage,
        reactToMessage: chatActions.reactToMessage,
        createGroup: chatActions.createGroup,
        joinGroup: chatActions.joinGroup,
        startCall,
        endCall,
        toggleMuteCall,
        toggleCameraCall,
        respondFriendRequest,
        sendFriendRequest,
        cancelFriendRequest,
        changeFriendshipType,
        removeFriend,
        blockFriend,
        unblockFriend,
        blockChat: chatActions.blockChat,
        unblockChat: chatActions.unblockChat,
        updateProfile,
        createTimeline,
        deleteTimeline,
        openChatWithUser: chatActions.openChatWithUser,
        toggleArchiveConversation: chatActions.toggleArchiveConversation,
        toggleMuteConversation: chatActions.toggleMuteConversation,
        deleteConversation: chatActions.deleteConversation,
        updateGroupInfo: chatActions.updateGroupInfo,
        addGroupMembers: chatActions.addGroupMembers,
        leaveGroup: chatActions.leaveGroup,
        refreshConversations: chatActions.refreshConversations,
        loadMoreConversations: chatActions.loadMoreConversations,
        loadOlderMessages: chatActions.loadOlderMessages,
        loadMessages: chatActions.loadMessages,
        hasMoreMessages,
        resolvePartnerUser: chatActions.resolvePartnerUser,
        loadMembers: chatActions.loadMembers,
        openSearchWindow: chatActions.openSearchWindow
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
