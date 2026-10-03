import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { MediaViewerModal } from '../common/MediaViewerModal';
import { LogoLoader } from '../common/LogoLoader';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Avatar } from '../common/Avatar';
import { MomentViewerModal } from '../moments/MomentViewerModal';
import { GroupSettingsModal } from './GroupSettingsModal';
import { Message, Moment, User } from '../../types';
import { ConversationMemberRole, type ConversationMemberDto } from '../../types/chat';
import { appHub } from '@/lib/signalr/app-hub';
import { searchGiphy, type GiphyItem } from '@/services/giphy';
import { getMomentById } from '@/services/moment';
import { emptyUser } from '@/lib/chat/mappers';
import { mapMoment } from '@/lib/moment/mappers';
import { 
  ArrowLeft, 
  Video, 
  Phone, 
  Send, 
  Image as ImageIcon, 
  Smile, 
  MapPin, 
  CheckCheck,
  Check,
  X,
  Play,
  Search,
  Camera,
  Download,
  Reply,
  Edit2,
  Trash2,
  Copy,
  Settings,
  Ban,
  Plus,
  AlertCircle,
  Loader2,
  ArrowDown,
  ShieldCheck,
  Users
} from 'lucide-react';

interface ChatRoomViewProps {
  conversationId: string;
  onBack: () => void;
  /** Moment attached from `/chat/{id}?momentId=` (share → chat flow). */
  pendingMomentId?: string | null;
}

const EMOJI_CATEGORIES = [
  {
    title: 'Phổ biến',
    emojis: ['❤️', '🔥', '😂', '🥰', '👍', '🎉', '✨', '🙌', '🥺', '😍', '👏', '💯']
  },
  {
    title: 'Biểu cảm',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '🙂', '😉', '😊', '😇', '😎', '🥳', '😏', '🤔', '😴', '😭', '🤯']
  },
  {
    title: 'Cử chỉ & Tình cảm',
    emojis: ['💖', '💕', '💓', '💗', '💘', '💌', '💋', '🤝', '✌️', '🤞', '🤟', '🤘', '👌', '🤏', '💪', '🙏', '👋', '👀']
  }
];

const GIF_TAG_QUERIES: Record<string, string> = {
  all: 'funny',
  party: 'party',
  happy: 'happy',
  love: 'love',
  haha: 'laugh',
  wow: 'wow',
};

const QUICK_REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

type DrawerType = 'emoji' | 'gif' | null;

/** Local optimistic send (API doc §19: pending set keyed by idempotencyKey —
 *  a retry reuses the same clientId so the server can dedupe). */
interface PendingSend {
  clientId: string;
  status: 'sending' | 'failed';
  text?: string;
  image?: string | File;
  video?: string | File;
  locationPin?: { lat: number; lng: number; name: string };
  replyTo?: { id: string; senderName: string; text?: string; imageUrl?: string };
  momentId?: string;
  previewUrl?: string;
}

export const ChatRoomView: React.FC<ChatRoomViewProps> = ({ conversationId, onBack, pendingMomentId }) => {
  const { 
    conversations, 
    messagesMap, 
    currentUser, 
    moments,
    sendMessage, 
    editMessage,
    deleteMessage,
    reactToMessage, 
    startCall, 
    blockChat,
    unblockChat,
    setSelectedUser,
    showToast,
    resolvePartnerUser,
    loadMembers,
    loadOlderMessages,
    loadMessages,
    hasMoreMessages,
    openSearchWindow
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [selectedGifTag, setSelectedGifTag] = useState<string>('all');
  
  // In-chat server search (window replace + jump, old-FE flow)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [highlightQuery, setHighlightQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Media Viewer state (image / video)
  const [activeMedia, setActiveMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    caption?: string;
    senderName?: string;
    timestamp?: string;
  } | null>(null);

  // Moment Detail Viewer state
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);

  // Group settings modal state
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  // Block friend confirmation dialog
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  // Message Actions state (Reply & Edit)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeActionMenuMsgId, setActiveActionMenuMsgId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Long-press hold timer ref for mobile hold-to-show popover
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const conversation = conversations.find(c => c.id === conversationId);
  const messages = useMemo(
    () => messagesMap[conversationId] || [],
    [messagesMap, conversationId],
  );

  // ---- API-backed chat state (design mocks removed) ---------------------
  const [partnerUser, setPartnerUser] = useState<User | null>(null);
  const [memberDtos, setMemberDtos] = useState<ConversationMemberDto[]>([]);
  const [pendingSends, setPendingSends] = useState<PendingSend[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<number, { name: string; expires: number }>>({});
  const [gifItems, setGifItems] = useState<GiphyItem[]>([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const olderPageLockRef = useRef(false);
  const typingThrottleRef = useRef(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUrlsRef = useRef<PendingSend[]>([]);
  useEffect(() => {
    pendingUrlsRef.current = pendingSends;
  }, [pendingSends]);

  // ---- Shared moment (?momentId=) + moments referenced by messages -------
  const [pendingMoment, setPendingMoment] = useState<Moment | null>(null);
  const [extraMoments, setExtraMoments] = useState<Moment[]>([]);
  const fetchingMomentIdsRef = useRef<Set<string>>(new Set());

  // Load the moment attached from the share flow.
  useEffect(() => {
    if (!pendingMomentId || !Number(pendingMomentId)) {
      setPendingMoment(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await getMomentById(Number(pendingMomentId));
        if (alive && res.data) setPendingMoment(mapMoment(res.data));
        else if (alive) showToast('Khoảnh khắc không khả dụng hoặc đã hết hạn.', 'error');
      } catch {
        if (alive) showToast('Không tải được khoảnh khắc để đính kèm.', 'error');
      }
    })();
    return () => { alive = false; };
  }, [pendingMomentId, showToast]);

  // On-demand fetch for moments in the thread that aren't in the feed page.
  useEffect(() => {
    for (const m of messages) {
      if (!m.momentId) continue;
      if (
        moments.some(x => x.id === m.momentId) ||
        extraMoments.some(x => x.id === m.momentId) ||
        fetchingMomentIdsRef.current.has(m.momentId)
      ) continue;
      fetchingMomentIdsRef.current.add(m.momentId);
      const id = m.momentId;
      getMomentById(Number(id))
        .then((res) => {
          if (res.data) setExtraMoments(prev => [...prev, mapMoment(res.data!)]);
        })
        .catch(() => { /* moment not visible — card falls back to placeholder */ })
        .finally(() => { fetchingMomentIdsRef.current.delete(id); });
    }
  }, [messages, moments, extraMoments]);

  const convReady = !!conversation;
  const convIsGroup = !!conversation?.isGroup;

  // Display-only partner until the member lookup resolves (direct chats).
  const partner: User = partnerUser ?? {
    ...currentUser,
    name: (!convIsGroup && conversation?.name) || currentUser.name,
    avatar: (!convIsGroup && conversation?.avatar) || currentUser.avatar,
  };

  const adminUserId = useMemo(
    () => memberDtos.find((m) => m.role === ConversationMemberRole.Host)?.userId,
    [memberDtos],
  );

  const typingNames = Object.values(typingUsers).map(t => t.name);
  const isPartnerTyping = !convIsGroup && typingNames.length > 0;
  const groupTypingText = convIsGroup && typingNames.length > 0
    ? (typingNames.length === 1 ? `${typingNames[0]} đang soạn tin...` : `${typingNames.length} người đang soạn tin...`)
    : null;

  // Resolve the direct-chat partner (profile / calls / chat-block target).
  useEffect(() => {
    if (!convReady) return;
    if (convIsGroup) {
      setPartnerUser(null);
      return;
    }
    let alive = true;
    setPartnerUser(null);
    void resolvePartnerUser(conversationId).then((u) => {
      if (alive) setPartnerUser(u);
    });
    return () => { alive = false; };
  }, [conversationId, convReady, convIsGroup, resolvePartnerUser]);

  // Group members (admin badge + member count fallback).
  useEffect(() => {
    if (!convReady || !convIsGroup) {
      setMemberDtos([]);
      return;
    }
    let alive = true;
    void loadMembers(conversationId).then((d) => {
      if (alive) setMemberDtos(d);
    });
    return () => { alive = false; };
  }, [conversationId, convReady, convIsGroup, loadMembers]);

  // Typing: global ReceiveTyping filtered to this room (4s auto-hide).
  useEffect(() => {
    const unsub = appHub.onReceiveTyping((data) => {
      if (Number(data.conversationId) !== Number(conversationId)) return;
      if (Number(data.userId) === Number(currentUser.id)) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (data.isTyping) next[data.userId] = { name: data.userName, expires: Date.now() + 4000 };
        else delete next[data.userId];
        return next;
      });
    });
    return unsub;
  }, [conversationId, currentUser.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const kept = Object.entries(prev).filter(([, v]) => v.expires > now);
        if (kept.length === Object.keys(prev).length) return prev;
        return Object.fromEntries(kept);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // GIPHY: fetch on drawer open and on tag/search change (debounced).
  useEffect(() => {
    if (activeDrawer !== 'gif') return;
    const query = gifSearch.trim() || GIF_TAG_QUERIES[selectedGifTag] || 'funny';
    let alive = true;
    setIsLoadingGifs(true);
    const timer = setTimeout(() => {
      void searchGiphy(query, 'gif')
        .then((items) => { if (alive) setGifItems(items); })
        .catch((err) => console.error('[ChatRoom] searchGiphy failed:', err))
        .finally(() => { if (alive) setIsLoadingGifs(false); });
    }, gifSearch ? 400 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [activeDrawer, gifSearch, selectedGifTag]);

  // Auto focus search input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  // ---- Server search window + jump (old-FE flow) -------------------------
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToAndHighlight = useCallback((messageId: number) => {
    const id = String(messageId);
    const el = listRef.current?.querySelector(`[data-msg-id="${id}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setHighlightedId(id);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedId((cur) => (cur === id ? null : cur));
    }, 2000);
  }, []);

  /** Fetch the server context window, swap the list, jump to the hit. */
  const runSearchWindow = useCallback(async (
    params: { messageId?: number; content?: string },
    queryText?: string,
  ) => {
    const found = await openSearchWindow(conversationId, params);
    if (!found) {
      showToast(
        params.messageId ? 'Không tìm thấy tin nhắn' : 'Không tìm thấy tin nhắn phù hợp',
        'error',
      );
      return;
    }
    setSearchMode(true);
    stickToBottomRef.current = false;
    if (queryText !== undefined) setHighlightQuery(queryText);
    setTimeout(() => scrollToAndHighlight(found.targetId), 60);
  }, [conversationId, openSearchWindow, showToast, scrollToAndHighlight]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q || isSearching) return;
    setIsSearching(true);
    try {
      await runSearchWindow({ content: q }, q);
    } finally {
      setIsSearching(false);
    }
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setHighlightQuery('');
    setHighlightedId(null);
    setSearchMode(false);
    stickToBottomRef.current = true;
    void loadMessages(conversationId);
  };

  // Back to the live tail (floating button + closing search from a window).
  const reloadToLatest = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setHighlightQuery('');
    setHighlightedId(null);
    setSearchMode(false);
    stickToBottomRef.current = true;
    void loadMessages(conversationId).finally(() => {
      const el = listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  };

  // Quote tap: jump when visible, otherwise fetch the context window first.
  const onTapReply = async (messageId: string) => {
    const numericId = Number(messageId);
    if (!numericId) return;
    if (messages.some((m) => m.id === messageId)) {
      scrollToAndHighlight(numericId);
      return;
    }
    await runSearchWindow({ messageId: numericId });
  };

  // Auto scroll to latest message (only when parked at the bottom —
  // never while a search window is open).
  useEffect(() => {
    if (searchQuery || searchMode) return;
    if (messages.length > 0 && !stickToBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeDrawer, replyingTo, editingMessage, searchQuery, searchMode]);

  // Revoke object-URL previews for optimistic file bubbles.
  useEffect(() => () => {
    pendingUrlsRef.current.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
  }, []);

  // The row may arrive async (deep-link → enterConversation fetches detail).
  // Only surface "not found" if it never shows up.
  const [showNotFound, setShowNotFound] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowNotFound(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!conversation) {
    return (
      <div className="p-8 text-center">
        {showNotFound ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Không tìm thấy cuộc trò chuyện.
          </span>
        ) : (
          <div className="flex justify-center">
            <LogoLoader size="md" text={null} />
          </div>
        )}
      </div>
    );
  }

  // Hold-to-show action popover handlers (Mobile-first long-press)
  const handleTouchStart = (msgId: string) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setActiveActionMenuMsgId(msgId);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const stopTypingSignal = () => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    if (typingThrottleRef.current) {
      typingThrottleRef.current = 0;
      void appHub.sendTyping(Number(conversationId), false).catch(() => {});
    }
  };

  const notifyTyping = () => {
    const now = Date.now();
    if (now - typingThrottleRef.current < 1500) return;
    typingThrottleRef.current = now;
    void appHub.sendTyping(Number(conversationId), true).catch(() => {});
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      typingThrottleRef.current = 0;
      typingStopTimerRef.current = null;
      void appHub.sendTyping(Number(conversationId), false).catch(() => {});
    }, 1500);
  };

  const handleInputChange = (value: string) => {
    setInputText(value);
    if (value) notifyTyping();
    else stopTypingSignal();
  };

  /** Runs one optimistic send. The clientId doubles as the idempotencyKey,
   *  so a retry after a failed send is deduped server-side. */
  const runSend = async (p: PendingSend): Promise<boolean> => {
    setPendingSends(prev => prev.map(x => x.clientId === p.clientId ? { ...x, status: 'sending' } : x));
    const ok = await sendMessage(
      conversationId,
      p.text,
      p.image,
      p.locationPin,
      p.video,
      p.replyTo,
      p.momentId,
      p.clientId,
    );
    setPendingSends(prev => {
      if (ok) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        return prev.filter(x => x.clientId !== p.clientId);
      }
      return prev.map(x => x.clientId === p.clientId ? { ...x, status: 'failed' } : x);
    });
    return ok;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingMoment) return;

    if (editingMessage) {
      const ok = await editMessage(conversationId, editingMessage.id, inputText.trim());
      if (ok) {
        setEditingMessage(null);
        setInputText('');
      }
      // On failure keep the text in the box so the user can retry.
      return;
    }

    const replyData = replyingTo ? {
      id: replyingTo.id,
      senderName: replyingTo.senderName || (replyingTo.senderId === currentUser.id ? currentUser.name : partner.name),
      text: replyingTo.text,
      imageUrl: replyingTo.imageUrl
    } : undefined;

    const pending: PendingSend = {
      clientId: crypto.randomUUID(),
      status: 'sending',
      text: inputText.trim() || undefined,
      replyTo: replyData,
      momentId: pendingMoment?.id,
    };
    // Pure text renders once via the hub echo — no optimistic bubble and no
    // "sending" status (media/location/moment keep theirs below).
    const showPending = pending.momentId != null;
    if (showPending) setPendingSends(prev => [...prev, pending]);
    setReplyingTo(null);
    setInputText('');
    setActiveDrawer(null);
    stopTypingSignal();
    const ok = await runSend(pending);
    if (!ok && !showPending) {
      // sendMessage already toasted — give the text back so it isn't lost.
      setInputText(pending.text ?? '');
    }
    if (ok && pending.momentId) setPendingMoment(null);
  };

  const handleSendGif = (gifUrl: string) => {
    setActiveDrawer(null);
    const pending: PendingSend = { clientId: crypto.randomUUID(), status: 'sending', image: gifUrl };
    setPendingSends(prev => [...prev, pending]);
    void runSend(pending).then((ok) => {
      if (ok) showToast('Đã gửi GIF từ Giphy ✨', 'success');
    });
  };

  const handleSendPhotoFile = (file: File) => {
    const pending: PendingSend = {
      clientId: crypto.randomUUID(),
      status: 'sending',
      image: file,
      previewUrl: URL.createObjectURL(file),
    };
    setPendingSends(prev => [...prev, pending]);
    void runSend(pending).then((ok) => {
      if (ok) showToast('Đã gửi ảnh thành công 📷', 'success');
    });
  };

  const handleSendVideoFile = (file: File) => {
    const pending: PendingSend = {
      clientId: crypto.randomUUID(),
      status: 'sending',
      video: file,
      previewUrl: URL.createObjectURL(file),
    };
    setPendingSends(prev => [...prev, pending]);
    void runSend(pending).then((ok) => {
      if (ok) showToast('Đã gửi video thành công 🎥', 'success');
    });
  };

  // Local Photo Upload (File goes straight to the presigned uploader)
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) handleSendPhotoFile(file);
  };

  // Local Video Upload
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) handleSendVideoFile(file);
  };

  const handleRetrySend = (p: PendingSend) => {
    void runSend(p);
  };

  const handleDiscardSend = (p: PendingSend) => {
    if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    setPendingSends(prev => prev.filter(x => x.clientId !== p.clientId));
  };

  // Infinite history paging: fetch the previous window and keep the
  // viewport pinned to the message the user was looking at.
  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distFromBottom < 80;
    // Far from the live tail → offer a way back down.
    setShowScrollBottom(distFromBottom > 400);
    if (
      el.scrollTop >= 60 ||
      !hasMoreMessages(conversationId) ||
      olderPageLockRef.current ||
      isLoadingOlder
    ) {
      return;
    }
    olderPageLockRef.current = true;
    setIsLoadingOlder(true);
    const prevHeight = el.scrollHeight;
    void loadOlderMessages(conversationId).finally(() => {
      olderPageLockRef.current = false;
      setIsLoadingOlder(false);
      requestAnimationFrame(() => {
        const node = listRef.current;
        if (node) node.scrollTop += node.scrollHeight - prevHeight;
      });
    });
  };

  // Message Action Handlers
  const handleReact = (msgId: string, emoji: string) => {
    reactToMessage(conversationId, msgId, emoji);
    setActiveActionMenuMsgId(null);
  };

  const handleStartReply = (msg: Message) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    setActiveActionMenuMsgId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessage(msg);
    setReplyingTo(null);
    setInputText(msg.text || '');
    setActiveActionMenuMsgId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCopyMessage = (msg: Message) => {
    const textToCopy = msg.text || msg.imageUrl || msg.videoUrl || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      showToast('Đã sao chép nội dung tin nhắn 📋', 'success');
    }
    setActiveActionMenuMsgId(null);
  };

  const handleDeleteMessage = (msgId: string) => {
    deleteMessage(conversationId, msgId);
    setActiveActionMenuMsgId(null);
    setConfirmDeleteId(null);
  };

  const handleConfirmBlock = async () => {
    if (!partnerUser) return;
    const ok = await blockChat(conversationId, partnerUser.id);
    setShowBlockConfirm(false);
    if (ok) {
      showToast(`Đã chặn ${partnerUser.name} 🚫`, 'info');
      onBack();
    }
  };

  const handleUnblock = () => {
    if (!partnerUser) return;
    void unblockChat(conversationId, partnerUser.id);
  };

  // Highlight the submitted search term inside message text.
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.trim().toLowerCase() ? (
            <mark key={index} className="bg-amber-300 text-slate-900 rounded-xs px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      
      {/* Hidden file inputs for photo and video attachment */}
      <input 
        ref={photoInputRef}
        type="file" 
        accept="image/*" 
        onChange={handlePhotoFileUpload}
        className="hidden" 
      />
      <input 
        ref={videoInputRef}
        type="file" 
        accept="video/*" 
        onChange={handleVideoFileUpload}
        className="hidden" 
      />

      {/* TOP HEADER */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between shadow-xs z-10">
        
        {/* Left: Back + Avatar + Name (Tapping avatar/name opens Profile) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            title="Quay lại"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div 
            onClick={() => {
              if (!conversation.isGroup && partnerUser) {
                setSelectedUser(partnerUser);
              }
            }}
            className={`relative shrink-0 ${!conversation.isGroup && partnerUser ? 'cursor-pointer group' : ''}`}
            title={!conversation.isGroup && partnerUser ? `Xem hồ sơ ${partner.name}` : undefined}
          >
            <Avatar
              src={conversation.isGroup ? conversation.avatar : partner.avatar}
              name={conversation.name || partner.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20 group-hover:ring-indigo-600 transition-all"
            />
            {!conversation.isGroup && conversation.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            )}
            {conversation.isGroup && (
              <span
                title="Nhóm trò chuyện"
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-600 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs"
              >
                <Users className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          <div 
            onClick={() => {
              if (!conversation.isGroup && partnerUser) {
                setSelectedUser(partnerUser);
              }
            }}
            className={`min-w-0 ${!conversation.isGroup && partnerUser ? 'cursor-pointer group' : ''}`}
          >
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-tight truncate whitespace-nowrap transition-colors">
              {conversation.isGroup ? conversation.name : partner.name}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate whitespace-nowrap">
              {conversation.isGroup
                ? groupTypingText || `${conversation.memberCount || memberDtos.length || '?'} thành viên`
                : isPartnerTyping
                ? 'Đang soạn tin...'
                : convIsGroup === false && conversation.isOnline
                ? 'Đang hoạt động'
                : 'Không hoạt động'}
            </div>
          </div>
        </div>

        {/* Right Header Actions: Distinct for Direct vs Group */}
        {conversation.isGroup ? (
          /* GROUP CHAT ACTIONS: SEARCH MSG & GROUP SETTINGS */
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isSearchOpen ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Tìm kiếm tin nhắn trong nhóm"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowGroupSettings(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cài đặt nhóm (Ảnh, Tên, Quyền riêng tư, Thành viên)"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* DIRECT MESSAGE ACTIONS: SEARCH MSG, CALLING (VOICE & VIDEO), BLOCK CHAT */
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isSearchOpen ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Tìm kiếm tin nhắn"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => partnerUser && startCall(partnerUser, false)}
              disabled={!partnerUser}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-wait"
              title="Gọi thoại"
            >
              <Phone className="w-4 h-4" />
            </button>

            <button
              onClick={() => partnerUser && startCall(partnerUser, true)}
              disabled={!partnerUser}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-wait"
              title="Gọi video"
            >
              <Video className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowBlockConfirm(true)}
              disabled={!partnerUser}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-wait"
              title="Chặn cuộc trò chuyện"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* SEARCH MESSAGE SLIDE-DOWN BAR */}
      {isSearchOpen && (
        <form
          onSubmit={handleSearchSubmit}
          className="shrink-0 bg-white dark:bg-slate-900 border-b border-indigo-100 dark:border-indigo-500/20 px-3.5 py-2 flex items-center gap-2 animate-in slide-in-from-top-2 shadow-xs z-10"
        >
          <Search className="w-4 h-4 text-indigo-600 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm nội dung tin nhắn..."
            className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-300 focus:bg-white dark:focus:bg-slate-800 rounded-xl px-3 py-1.5 focus:outline-none"
          />
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
          ) : searchMode && highlightQuery ? (
            <span className="text-[11px] font-bold text-indigo-600 truncate max-w-[120px] shrink-0">
              “{highlightQuery}”
            </span>
          ) : null}
          <button
            type="button"
            onClick={closeSearch}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* MESSAGES STREAM */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5"
        onScroll={handleListScroll}
        onClick={() => {
          setActiveDrawer(null);
          setActiveActionMenuMsgId(null);
        }}
      >
        {isLoadingOlder && (
          <div className="py-2 flex justify-center">
            <LogoLoader size="sm" text={null} />
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const sender = isMe
            ? currentUser
            : msg.senderName
            ? emptyUser(msg.senderId, msg.senderName, msg.senderAvatar || '')
            : currentUser;
          const isMenuOpen = activeActionMenuMsgId === msg.id;

          // Check if message references a moment (feed page or on-demand cache)
          const momentData = msg.momentId
            ? moments.find(m => m.id === msg.momentId) ?? extraMoments.find(m => m.id === msg.momentId)
            : null;

          // System messages render as a centered neutral pill — no avatar,
          // bubble, or actions.
          if (msg.renderType === 'System') {
            return (
              <div
                key={msg.id}
                data-msg-id={msg.id}
                className="flex justify-center"
              >
                <div className="px-3 py-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400 text-center leading-relaxed max-w-[85%]">
                  {msg.text || 'Thông báo hệ thống'}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              data-msg-id={msg.id}
              className={`flex flex-col relative rounded-2xl transition-colors ${isMe ? 'items-end' : 'items-start'} ${
                highlightedId === msg.id ? 'ring-2 ring-indigo-500 bg-indigo-50/70 -mx-1 px-1 py-0.5' : ''
              }`}
            >
              {/* SENDER NAME & AVATAR (SHOWS FOR ALL RECEIVED MESSAGES, TAP TO VIEW PROFILE) */}
              {!isMe && (
                <div 
                  onClick={() => setSelectedUser(sender)}
                  className="flex items-center gap-1.5 mb-1 ml-0.5 cursor-pointer group/sender select-none"
                  title={`Xem hồ sơ của ${sender.name}`}
                >
                  <Avatar
                    src={sender.avatar}
                    name={sender.name}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10 group-hover/sender:ring-indigo-600 transition-all"
                    textClassName="text-[8px]"
                  />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover/sender:text-indigo-600 dark:group-hover/sender:text-indigo-400 transition-colors">
                    {sender.name}
                  </span>
                  {conversation.isGroup && adminUserId != null && Number(msg.senderId) === adminUserId && (
                    <span
                      title="Quản trị viên"
                      className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white inline-flex items-center justify-center shrink-0"
                    >
                      <ShieldCheck className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-end gap-1.5 max-w-[88%] relative">
                
                {/* MESSAGE BUBBLE WITH MOBILE HOLD-TO-SHOW POPOVER */}
                <div 
                  className="relative touch-pan-y"
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(msg.id)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActiveActionMenuMsgId(msg.id);
                  }}
                >
                  
                  {/* QUOTE / REPLY PREVIEW IN BUBBLE — tap to jump to source */}
                  {msg.replyTo && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        void onTapReply(msg.replyTo!.id);
                      }}
                      className={`mb-1 px-2.5 py-1.5 rounded-xl text-[11px] border-l-3 max-w-full cursor-pointer hover:opacity-80 active:scale-98 transition-all ${
                        isMe 
                          ? 'border-indigo-300 bg-indigo-700/30 text-indigo-50' 
                          : 'border-indigo-500 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                      title="Chạm để xem tin nhắn gốc"
                    >
                      <div className="font-bold text-[10px] text-indigo-400 flex items-center gap-1">
                        <Reply className="w-2.5 h-2.5" />
                        <span>{msg.replyTo.senderName}</span>
                      </div>
                      <p className="truncate text-[10px] opacity-90 mt-0.5">
                        {msg.replyTo.imageUrl ? '[GIF]' : msg.replyTo.text || '[Hình ảnh/Phương tiện]'}
                      </p>
                    </div>
                  )}

                  {/* 1. PHOTO / GIF MESSAGE - Tap to open MediaViewerModal with Download */}
                  {msg.imageUrl && (
                    <div 
                      onClick={(e) => {
                        if (isLongPressRef.current) return;
                        e.stopPropagation();
                        setActiveMedia({
                          url: msg.imageUrl!,
                          type: 'image',
                          senderName: sender.name,
                          timestamp: msg.timestamp,
                          caption: msg.text
                        });
                      }}
                      className="rounded-2xl overflow-hidden mb-1 border border-slate-200/80 dark:border-slate-700 shadow-xs max-w-[220px] bg-slate-100 cursor-pointer relative group/media"
                    >
                      <img
                        src={msg.imageUrl}
                        alt="Attached media"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto object-cover max-h-56 hover:opacity-95 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover/media:opacity-100">
                        <div className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                          <Download className="w-3 h-3" />
                          <span>Xem & Tải</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. VIDEO MESSAGE - Tap to open MediaViewerModal with Download */}
                  {msg.videoUrl && (
                    <div 
                      onClick={(e) => {
                        if (isLongPressRef.current) return;
                        e.stopPropagation();
                        setActiveMedia({
                          url: msg.videoUrl!,
                          type: 'video',
                          senderName: sender.name,
                          timestamp: msg.timestamp,
                          caption: msg.text
                        });
                      }}
                      className="rounded-2xl overflow-hidden mb-1 border border-slate-200/80 dark:border-slate-700 shadow-xs max-w-[240px] bg-black cursor-pointer relative group/video"
                    >
                      <video
                        src={msg.videoUrl}
                        playsInline
                        className="w-full h-auto max-h-56 object-cover rounded-2xl pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-white/95 text-indigo-600 flex items-center justify-center shadow-lg group-hover/video:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-indigo-600 ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-1">
                        <Download className="w-2.5 h-2.5" />
                        <span>Xem & Tải</span>
                      </div>
                    </div>
                  )}

                  {/* 3. MOMENT CARD: DESC & LOCATION OVERLAP (ON TOP) OF THE MOMENT MEDIA */}
                  {msg.momentId && (
                    momentData ? (
                      <div
                        onClick={(e) => {
                          if (isLongPressRef.current) return;
                          e.stopPropagation();
                          setSelectedMoment(momentData);
                        }}
                        className="relative rounded-2xl overflow-hidden aspect-[4/3] w-64 max-w-[260px] shadow-md border border-slate-200 cursor-pointer group/moment mb-1.5"
                      >
                        {/* Moment Media */}
                        <img
                          src={momentData.imageUrl}
                          alt={momentData.caption}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover/moment:scale-105 transition-transform duration-300"
                        />

                        {/* Video Play Overlay Icon if video */}
                        {momentData.mediaType === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-white/90 text-indigo-600 flex items-center justify-center shadow-lg">
                              <Play className="w-5 h-5 fill-indigo-600 ml-0.5" />
                            </div>
                          </div>
                        )}

                        {/* Top Badge: Camera + Khoảnh khắc & Time ago */}
                        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                          <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                            <Camera className="w-3 h-3 text-indigo-400" />
                            <span>Khoảnh khắc</span>
                          </div>
                          <div className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-medium">
                            {momentData.timeAgo}
                          </div>
                        </div>

                        {/* BOTTOM OVERLAY: DESC & LOCATION OVERLAP ON TOP OF MEDIA */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8 text-white flex flex-col justify-end pointer-events-none">
                          {momentData.caption && (
                            <p className="text-xs font-semibold text-white leading-snug line-clamp-2 drop-shadow-xs mb-1">
                              {momentData.caption}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-[11px] text-white/90 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="truncate">{momentData.locationName}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-400 dark:text-slate-500 italic mb-1">
                        Khoảnh khắc không khả dụng hoặc đã hết hạn
                      </div>
                    )
                  )}

                  {/* 4. LOCATION PIN SHARE */}
                  {msg.locationPin && (
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-1 flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Vị trí chia sẻ</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{msg.locationPin.name}</div>
                        <div className="text-[11px] text-emerald-600 font-bold mt-1">
                          📍 Đã chia sẻ tọa độ GPS
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DELETED (TOMBSTONE) MESSAGE */}
                  {msg.isDeleted && (
                    <div className="px-3.5 py-2.5 rounded-2xl text-[11px] italic bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                      Tin nhắn đã bị xóa
                    </div>
                  )}

                  {/* 5. TEXT BUBBLE WITH SEARCH-TERM HIGHLIGHT */}
                  {msg.text && (
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs relative ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-xs'
                      }`}
                    >
                      {renderHighlightedText(msg.text, highlightQuery)}
                    </div>
                  )}

                  {/* REACTIONS DISPLAY */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`flex items-center gap-0.5 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {msg.reactions.map((r, rIdx) => (
                        <button
                          key={rIdx}
                          onClick={() => handleReact(msg.id, r.emoji)}
                          className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full px-1.5 py-0.2 text-[10px] shadow-xs hover:scale-110 transition-transform cursor-pointer"
                        >
                          {r.emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* POPOVER ACTION MENU (SHOWN ON HOLD/LONG-PRESS): REACT, REPLY, EDIT, DELETE, COPY */}
                  {isMenuOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute -top-12 ${isMe ? 'right-0' : 'left-0'} bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-1.5 z-30 flex flex-col gap-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-150`}
                    >
                      {/* EMOJI REACTION QUICK BAR */}
                      <div className="flex items-center justify-between px-1 py-1 border-b border-slate-100 dark:border-slate-800">
                        {QUICK_REACTION_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className="w-6 h-6 flex items-center justify-center text-sm hover:scale-130 transition-transform cursor-pointer"
                            title={`Thả cảm xúc ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* ACTION BUTTONS: REPLY, COPY, EDIT, DELETE */}
                      <div className="flex flex-col py-0.5">
                        <button
                          onClick={() => handleStartReply(msg)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Trả lời</span>
                        </button>

                        <button
                          onClick={() => handleCopyMessage(msg)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Sao chép</span>
                        </button>

                        {isMe && msg.text && (
                          <button
                            onClick={() => handleStartEdit(msg)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-amber-50 text-amber-700 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Chỉnh sửa</span>
                          </button>
                        )}

                        {isMe && (
                          <button
                            onClick={() => setConfirmDeleteId(msg.id)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Xóa tin nhắn</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Timestamp, Edited badge & Status */}
              <div className={`flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <span>{msg.timestamp}</span>
                {isMe && (
                  <span>
                    {msg.status === 'read' ? (
                      <CheckCheck className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <Check className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* OPTIMISTIC PENDING / FAILED SENDS (retry reuses idempotencyKey) */}
        {pendingSends.map((p) => {
          // Media being processed shows a loading overlay on the preview
          // itself — never a "Đang gửi..." text row.
          const isMediaPreview = !!(p.previewUrl && (p.image || p.video));
          return (
          <div key={p.clientId} className="flex flex-col items-end">
            {p.previewUrl && p.video && (
              <div className="relative mb-1">
                <video src={p.previewUrl} playsInline className="rounded-2xl max-h-40 border border-slate-200" />
                {p.status === 'sending' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                    <LoadingSpinner size="md" light />
                  </div>
                )}
              </div>
            )}
            {p.previewUrl && p.image && (
              <div className="relative mb-1">
                <img src={p.previewUrl} alt="Đang gửi" className="rounded-2xl max-h-40 object-cover border border-slate-200" />
                {p.status === 'sending' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                    <LoadingSpinner size="md" light />
                  </div>
                )}
              </div>
            )}
            {p.text && (
              <div className="px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs bg-indigo-600 text-white rounded-br-xs max-w-[88%]">
                {p.text}
              </div>
            )}
            {p.status === 'sending' ? (
              // Media shows the overlay above instead of this text row.
              isMediaPreview ? null : (
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 px-1 animate-pulse">
                  Đang gửi...
                </span>
              )
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5 px-1">
                <AlertCircle className="w-3 h-3 text-rose-500" />
                <span className="text-[9px] text-rose-500 font-semibold">Gửi thất bại</span>
                <button
                  onClick={() => handleRetrySend(p)}
                  className="text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Thử lại
                </button>
                <button
                  onClick={() => handleDiscardSend(p)}
                  className="text-[9px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  Xóa
                </button>
              </div>
            )}
          </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 1. EMOJI BOTTOM SHEET */}
      {activeDrawer === 'emoji' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveDrawer(null)}
        >
          <div
            className="w-full sm:max-w-md mx-auto bg-white dark:bg-slate-900 rounded-t-[32px] border-t border-x border-slate-100 dark:border-slate-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[65dvh] flex flex-col animate-in slide-in-from-bottom-8 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Biểu tượng cảm xúc (Emoji)</span>
              <button
                onClick={() => setActiveDrawer(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto no-scrollbar">
              {EMOJI_CATEGORIES.map((cat, catIdx) => (
                <div key={catIdx}>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">{cat.title}</div>
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 text-center">
                  {cat.emojis.map((emoji, eIdx) => (
                    <button
                      key={eIdx}
                      type="button"
                      onClick={() => setInputText(prev => prev + emoji)}
                      className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-2xl hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. GIF (GIPHY) BOTTOM SHEET */}
      {activeDrawer === 'gif' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveDrawer(null)}
        >
        <div
          className="w-full sm:max-w-md mx-auto bg-white dark:bg-slate-900 rounded-t-[32px] border-t border-x border-slate-100 dark:border-slate-800 p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-2xl h-[65dvh] flex flex-col animate-in slide-in-from-bottom-8 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-black text-white text-[10px] font-black tracking-widest">GIPHY</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tìm kiếm ảnh động</span>
            </div>
            <button 
              onClick={() => setActiveDrawer(null)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={gifSearch}
              onChange={(e) => setGifSearch(e.target.value)}
              placeholder="Tìm kiếm GIF theo từ khóa..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-purple-300 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mb-2 py-0.5">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'party', label: '🎉 Tiệc tùng' },
              { id: 'happy', label: '😄 Vui vẻ' },
              { id: 'love', label: '❤️ Thả tim' },
              { id: 'haha', label: '🤣 Cười bò' },
              { id: 'wow', label: '😲 Kinh ngạc' }
            ].map(tag => (
              <button
                key={tag.id}
                onClick={() => setSelectedGifTag(tag.id)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold whitespace-nowrap truncate shrink-0 cursor-pointer transition-colors ${
                  selectedGifTag === tag.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-3 gap-2 content-start">
            {isLoadingGifs ? (
              <div className="col-span-3 text-center py-6 text-[11px] text-slate-400 dark:text-slate-500 animate-pulse">
                Đang tìm GIF...
              </div>
            ) : gifItems.length === 0 ? (
              <div className="col-span-3 text-center py-6 text-[11px] text-slate-400 dark:text-slate-500">
                Không tìm thấy GIF phù hợp
              </div>
            ) : (
              gifItems.map((gif, idx) => (
                <button
                  key={`${gif.id}-${idx}`}
                  onClick={() => handleSendGif(gif.url)}
                  className="w-full h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-purple-600 transition-all cursor-pointer relative group shrink-0"
                >
                  <img
                    src={gif.thumbUrl || gif.url}
                    alt="GIF"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    loading="lazy"
                    className="block w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </button>
              ))
            )}
          </div>
        </div>
        </div>
      )}

      {/* FLOATING REPLY BANNER ABOVE INPUT */}
      {replyingTo && (
        <div className="px-3.5 py-2 bg-indigo-50/95 border-t border-indigo-100 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-indigo-700 block truncate">
                Đang trả lời {replyingTo.senderId === currentUser.id ? 'chính bạn' : (replyingTo.senderName || partner.name)}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate block">
                {replyingTo.text || (replyingTo.imageUrl ? '📷 [Hình ảnh]' : replyingTo.videoUrl ? '🎥 [Video]' : '[Tệp đính kèm]')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 cursor-pointer"
            title="Hủy trả lời"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* FLOATING EDIT BANNER ABOVE INPUT */}
      {editingMessage && (
        <div className="px-3.5 py-2 bg-amber-50/95 border-t border-amber-100 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <Edit2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-amber-700 block">
                Đang chỉnh sửa tin nhắn
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate block">
                {editingMessage.text}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 cursor-pointer"
            title="Hủy chỉnh sửa"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SCROLL TO BOTTOM — icon only; in a search window it reloads live */}
      {(showScrollBottom || searchMode) && (
        <div className="absolute bottom-24 right-3 z-20 animate-in fade-in zoom-in-95">
          <button
            onClick={() => {
              if (searchMode) {
                reloadToLatest();
                return;
              }
              stickToBottomRef.current = true;
              setShowScrollBottom(false);
              const el = listRef.current;
              if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            }}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            title={searchMode ? 'Về tin nhắn mới nhất' : 'Xuống cuối'}
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PENDING SHARED MOMENT CHIP (?momentId=) ABOVE THE INPUT */}
      {pendingMoment && !conversation.isBlocked && !editingMessage && (
        <div className="px-3.5 py-2 bg-indigo-50/95 border-t border-indigo-100 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={pendingMoment.imageUrl}
              alt={pendingMoment.caption}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-lg object-cover border border-indigo-200 shadow-xs"
            />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-indigo-700 block">
                Khoảnh khắc đính kèm
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate block">
                {pendingMoment.caption || 'Nhấn gửi để chia sẻ khoảnh khắc'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingMoment(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 cursor-pointer shrink-0"
            title="Bỏ đính kèm khoảnh khắc"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* BLOCKED CONVERSATION BAR — replaces the composer while blocked */}
      {conversation.isBlocked && (
        <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Ban className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {conversation.blockedById === Number(currentUser.id)
                  ? `Bạn đã chặn ${partner.name}`
                  : 'Cuộc trò chuyện đã bị chặn'}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {conversation.blockedById === Number(currentUser.id)
                  ? 'Bỏ chặn để tiếp tục gửi tin nhắn'
                  : 'Bạn không thể gửi tin nhắn lúc này'}
              </div>
            </div>
          </div>
          {conversation.blockedById === Number(currentUser.id) && (
            <button
              onClick={handleUnblock}
              disabled={!partnerUser}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs cursor-pointer disabled:opacity-40 shrink-0"
            >
              Bỏ chặn
            </button>
          )}
        </div>
      )}

      {/* COMPOSER BOTTOM INPUT BAR: INLINE APPEND LIST ON '+' TAP, SHRINKS INPUT BOX */}
      {!conversation.isBlocked && (
      <form onSubmit={handleSend} className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center gap-1.5 z-10">
        
        {/* LEFT SIDE TOOLS: EMOJI, PLUS (TOGGLES INLINE EXPANSION: PHOTO, VIDEO, LOCATION, GIF) */}
        <div className="flex items-center gap-1 shrink-0 transition-all duration-200">
          
          {/* 1. EMOJI BUTTON */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'emoji' ? null : 'emoji')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeDrawer === 'emoji'
                ? 'bg-amber-100 text-amber-700 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Biểu tượng cảm xúc (Emoji)"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* 2. PLUS BUTTON (EXPANDS INLINE LIST WITHOUT POPOVER) */}
          <button
            type="button"
            onClick={() => setIsToolsExpanded(!isToolsExpanded)}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isToolsExpanded
                ? 'bg-indigo-600 text-white rotate-45 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isToolsExpanded ? "Thu gọn công cụ" : "Mở rộng công cụ (Ảnh, Video, Vị trí, GIF)"}
          >
            <Plus className="w-4 h-4 transition-transform duration-200" />
          </button>

          {/* INLINE EXPANDED TOOLS (PHOTO, VIDEO, LOCATION, GIF) */}
          {isToolsExpanded && (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
              
              {/* Photo Upload */}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                title="Gửi ảnh từ thiết bị"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Video Upload */}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/20 transition-colors cursor-pointer"
                title="Gửi video từ thiết bị"
              >
                <Video className="w-4 h-4" />
              </button>

              {/* GIF Search */}
              <button
                type="button"
                onClick={() => setActiveDrawer(activeDrawer === 'gif' ? null : 'gif')}
                className={`px-2 py-1 rounded-xl text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                  activeDrawer === 'gif'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-500/20 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300'
                }`}
                title="Tìm kiếm ảnh GIF"
              >
                GIF
              </button>
            </div>
          )}

        </div>

        {/* Message Input Box (Shrinks smoothly when tools expand) */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={editingMessage ? "Cập nhật nội dung..." : replyingTo ? "Nhập câu trả lời..." : "Nhập tin nhắn..."}
          className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-slate-200 dark:focus:border-slate-600 rounded-2xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[80px]"
        />

        {/* Send / Update Button */}
        <button
          type="submit"
          disabled={!inputText.trim() && !pendingMoment}
          className={`w-9 h-9 rounded-2xl text-white flex items-center justify-center shadow-md disabled:opacity-30 active:scale-95 transition-all cursor-pointer shrink-0 ${
            editingMessage 
              ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
          }`}
          title={editingMessage ? "Lưu thay đổi" : "Gửi tin nhắn"}
        >
          {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
      )}

      {/* FULLSCREEN MEDIA VIEWER MODAL (IMAGE/VIDEO) WITH DOWNLOAD AND CLOSE BUTTON ONLY */}
      {activeMedia && (
        <MediaViewerModal
          mediaUrl={activeMedia.url}
          mediaType={activeMedia.type}
          caption={activeMedia.caption}
          senderName={activeMedia.senderName}
          timestamp={activeMedia.timestamp}
          onClose={() => setActiveMedia(null)}
        />
      )}

      {/* MOMENT VIEWER MODAL */}
      {selectedMoment && (
        <MomentViewerModal
          moment={selectedMoment}
          onClose={() => setSelectedMoment(null)}
        />
      )}

      {/* GROUP SETTINGS MODAL (AVATAR, NAME, PRIVACY, MEMBERSHIP, LEAVE GROUP) */}
      {showGroupSettings && (
        <GroupSettingsModal
          conversation={conversation}
          onClose={() => setShowGroupSettings(false)}
          onLeaveGroupSuccess={() => {
            setShowGroupSettings(false);
            onBack();
          }}
        />
      )}

      {/* CONFIRM BLOCK FRIEND / CHAT DIALOG */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xs w-full p-5 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Ban className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Chặn {partnerUser?.name || partner.name}?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Bạn sẽ không nhận được tin nhắn từ người này trong cuộc trò chuyện cho đến khi bỏ chặn.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmBlock}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Chặn cuộc trò chuyện
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MESSAGE DIALOG */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xs w-full p-4.5 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Xóa tin nhắn?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Tin nhắn này sẽ bị xóa khỏi cuộc trò chuyện.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteMessage(confirmDeleteId)}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
