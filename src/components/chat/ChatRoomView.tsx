import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { MediaViewerModal } from "../common/MediaViewerModal";
import { LogoLoader } from "../common/LogoLoader";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { Avatar } from "../common/Avatar";
import { MomentViewerModal } from "../moments/MomentViewerModal";
import { GroupSettingsModal } from "./GroupSettingsModal";
import { Message, Moment, User } from "../../types";
import { ConversationMemberRole, type ConversationMemberDto } from "../../types/chat";
import { appHub } from "@/lib/signalr/app-hub";
import { searchGiphy, type GiphyItem } from "@/services/giphy";
import { getMomentById } from "@/services/moment";
import { emptyUser } from "@/lib/chat/mappers";
import { mapMoment } from "@/lib/moment/mappers";
import {
  ArrowLeft,
  Video,
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
  Users,
} from "lucide-react";

interface ChatRoomViewProps {
  conversationId: string;
  onBack: () => void;
  /** Moment attached from `/chat/{id}?momentId=` (share → chat flow). */
  pendingMomentId?: string | null;
}

const EMOJI_CATEGORIES = [
  {
    title: "Phổ biến",
    emojis: ["❤️", "🔥", "😂", "🥰", "👍", "🎉", "✨", "🙌", "🥺", "😍", "👏", "💯"],
  },
  {
    title: "Biểu cảm",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "🙂",
      "😉",
      "😊",
      "😇",
      "😎",
      "🥳",
      "😏",
      "🤔",
      "😴",
      "😭",
      "🤯",
    ],
  },
  {
    title: "Cử chỉ & Tình cảm",
    emojis: [
      "💖",
      "💕",
      "💓",
      "💗",
      "💘",
      "💌",
      "💋",
      "🤝",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "👌",
      "🤏",
      "💪",
      "🙏",
      "👋",
      "👀",
    ],
  },
];

const GIF_TAG_QUERIES: Record<string, string> = {
  all: "funny",
  party: "party",
  happy: "happy",
  love: "love",
  haha: "laugh",
  wow: "wow",
};

const QUICK_REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

type DrawerType = "emoji" | "gif" | null;

/** Local optimistic send (API doc §19: pending set keyed by idempotencyKey —
 *  a retry reuses the same clientId so the server can dedupe). */
interface PendingSend {
  clientId: string;
  status: "sending" | "failed";
  text?: string;
  image?: string | File;
  video?: string | File;
  locationPin?: { lat: number; lng: number; name: string };
  replyTo?: {
    id: string;
    senderName: string;
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    mediaType?: "text" | "image" | "video" | "gif" | "location" | "moment";
  };
  momentId?: string;
  previewUrl?: string;
}

export const ChatRoomView: React.FC<ChatRoomViewProps> = ({
  conversationId,
  onBack,
  pendingMomentId,
}) => {
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
    openSearchWindow,
  } = useApp();

  const [inputText, setInputText] = useState("");
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [selectedGifTag, setSelectedGifTag] = useState<string>("all");

  // In-chat server search (window replace + jump, old-FE flow)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [highlightQuery, setHighlightQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Media Viewer state (image / video)
  const [activeMedia, setActiveMedia] = useState<{
    url: string;
    type: "image" | "video";
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

  const conversation = conversations.find((c) => c.id === conversationId);
  const messages = useMemo(() => messagesMap[conversationId] || [], [messagesMap, conversationId]);

  // ---- API-backed chat state (design mocks removed) ---------------------
  const [partnerUser, setPartnerUser] = useState<User | null>(null);
  const [memberDtos, setMemberDtos] = useState<ConversationMemberDto[]>([]);
  const [pendingSends, setPendingSends] = useState<PendingSend[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<number, { name: string; expires: number }>>(
    {},
  );
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
        else if (alive) showToast("Khoảnh khắc không khả dụng hoặc đã hết hạn.", "error");
      } catch {
        if (alive) showToast("Không tải được khoảnh khắc để đính kèm.", "error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [pendingMomentId, showToast]);

  // On-demand fetch for moments in the thread that aren't in the feed page.
  useEffect(() => {
    for (const m of messages) {
      if (!m.momentId) continue;
      if (
        moments.some((x) => x.id === m.momentId) ||
        extraMoments.some((x) => x.id === m.momentId) ||
        fetchingMomentIdsRef.current.has(m.momentId)
      )
        continue;
      fetchingMomentIdsRef.current.add(m.momentId);
      const id = m.momentId;
      getMomentById(Number(id))
        .then((res) => {
          if (res.data) setExtraMoments((prev) => [...prev, mapMoment(res.data!)]);
        })
        .catch(() => {
          /* moment not visible — card falls back to placeholder */
        })
        .finally(() => {
          fetchingMomentIdsRef.current.delete(id);
        });
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

  const typingNames = Object.values(typingUsers).map((t) => t.name);
  const isPartnerTyping = !convIsGroup && typingNames.length > 0;
  const groupTypingText =
    convIsGroup && typingNames.length > 0
      ? typingNames.length === 1
        ? `${typingNames[0]} đang soạn tin...`
        : `${typingNames.length} người đang soạn tin...`
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
    return () => {
      alive = false;
    };
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
    return () => {
      alive = false;
    };
  }, [conversationId, convReady, convIsGroup, loadMembers]);

  // Typing: global ReceiveTyping filtered to this room (4s auto-hide).
  useEffect(() => {
    setTypingUsers({});
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

  // Never leave a stale "typing..." on the partner side when leaving/sending.
  useEffect(() => {
    const convId = Number(conversationId);
    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      typingThrottleRef.current = 0;
      if (convId) void appHub.sendTyping(convId, false).catch(() => {});
    };
  }, [conversationId]);

  // Typing bubble pins the viewport down while the partner is typing.
  const hasTyping = Object.keys(typingUsers).length > 0;
  useEffect(() => {
    if (!hasTyping || searchMode) return;
    if (!stickToBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hasTyping, searchMode]);

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
    if (activeDrawer !== "gif") return;
    const query = gifSearch.trim() || GIF_TAG_QUERIES[selectedGifTag] || "funny";
    let alive = true;
    setIsLoadingGifs(true);
    const timer = setTimeout(
      () => {
        void searchGiphy(query, "gif")
          .then((items) => {
            if (alive) setGifItems(items);
          })
          .catch((err) => console.error("[ChatRoom] searchGiphy failed:", err))
          .finally(() => {
            if (alive) setIsLoadingGifs(false);
          });
      },
      gifSearch ? 400 : 0,
    );
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
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setHighlightedId(id);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedId((cur) => (cur === id ? null : cur));
    }, 2000);
  }, []);

  /** Fetch the server context window, swap the list, jump to the hit. */
  const runSearchWindow = useCallback(
    async (params: { messageId?: number; content?: string }, queryText?: string) => {
      const found = await openSearchWindow(conversationId, params);
      if (!found) {
        showToast(
          params.messageId ? "Không tìm thấy tin nhắn" : "Không tìm thấy tin nhắn phù hợp",
          "error",
        );
        return;
      }
      setSearchMode(true);
      stickToBottomRef.current = false;
      if (queryText !== undefined) setHighlightQuery(queryText);
      setTimeout(() => scrollToAndHighlight(found.targetId), 60);
    },
    [conversationId, openSearchWindow, showToast, scrollToAndHighlight],
  );

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
    setSearchQuery("");
    setHighlightQuery("");
    setHighlightedId(null);
    setSearchMode(false);
    stickToBottomRef.current = true;
    void loadMessages(conversationId);
  };

  // Back to the live tail (floating button + closing search from a window).
  const reloadToLatest = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setHighlightQuery("");
    setHighlightedId(null);
    setSearchMode(false);
    stickToBottomRef.current = true;
    void loadMessages(conversationId).finally(() => {
      const el = listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

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

  // Auto scroll to the live tail when the detail opens or the thread changes,
  // but never while a search window is pinned to a different hit.
  useEffect(() => {
    if (searchQuery || searchMode || !convReady) return;
    if (!stickToBottomRef.current) return;

    const timer = window.setTimeout(() => {
      scrollToBottom("auto");
    }, 60);

    return () => window.clearTimeout(timer);
  }, [convReady, conversationId, messages.length, pendingSends.length, searchQuery, searchMode, scrollToBottom]);

  useEffect(() => {
    if (searchQuery || searchMode) return;
    if (messages.length > 0 && !stickToBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pendingSends.length, activeDrawer, replyingTo, editingMessage, searchQuery, searchMode]);

  // Revoke object-URL previews for optimistic file bubbles.
  useEffect(
    () => () => {
      pendingUrlsRef.current.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    },
    [],
  );

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
      if (typeof navigator !== "undefined" && navigator.vibrate) {
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
    setPendingSends((prev) =>
      prev.map((x) => (x.clientId === p.clientId ? { ...x, status: "sending" } : x)),
    );
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
    setPendingSends((prev) => {
      if (ok) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        return prev.filter((x) => x.clientId !== p.clientId);
      }
      return prev.map((x) => (x.clientId === p.clientId ? { ...x, status: "failed" } : x));
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
        setInputText("");
      }
      // On failure keep the text in the box so the user can retry.
      return;
    }

    const replyData = replyingTo
      ? {
          id: replyingTo.id,
          senderName:
            replyingTo.senderName ||
            (replyingTo.senderId === currentUser.id ? currentUser.name : partner.name),
          text: replyingTo.text,
          imageUrl: replyingTo.imageUrl,
          videoUrl: replyingTo.videoUrl,
          mediaType: replyingTo.mediaType,
        }
      : undefined;

    const pending: PendingSend = {
      clientId: crypto.randomUUID(),
      status: "sending",
      text: inputText.trim() || undefined,
      replyTo: replyData,
      momentId: pendingMoment?.id,
    };
    // Pure text renders once via the hub echo — no optimistic bubble and no
    // "sending" status (media/location/moment keep theirs below).
    const showPending = pending.momentId != null;
    if (showPending) setPendingSends((prev) => [...prev, pending]);
    setReplyingTo(null);
    setInputText("");
    setActiveDrawer(null);
    stopTypingSignal();
    const ok = await runSend(pending);
    if (!ok && !showPending) {
      // sendMessage already toasted — give the text back so it isn't lost.
      setInputText(pending.text ?? "");
    }
    if (ok) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
      if (pending.momentId) setPendingMoment(null);
    }
  };

  const handleSendGif = (gifUrl: string) => {
    setActiveDrawer(null);
    const pending: PendingSend = {
      clientId: crypto.randomUUID(),
      status: "sending",
      image: gifUrl,
    };
    setPendingSends((prev) => [...prev, pending]);
    void runSend(pending).then((ok) => {
      if (ok) showToast("Đã gửi GIF từ Giphy", "success");
    });
  };

  const handleSendPhotoFile = (file: File) => {
    const pending: PendingSend = {
      clientId: crypto.randomUUID(),
      status: "sending",
      image: file,
      previewUrl: URL.createObjectURL(file),
    };
    setPendingSends((prev) => [...prev, pending]);
    void runSend(pending).then((ok) => {
      if (ok) showToast("Đã gửi ảnh thành công", "success");
    });
  };

  const handleSendVideoFile = (file: File) => {
    const pending: PendingSend = {
      clientId: crypto.randomUUID(),
      status: "sending",
      video: file,
      previewUrl: URL.createObjectURL(file),
    };
    setPendingSends((prev) => [...prev, pending]);
    void runSend(pending).then((ok) => {
      if (ok) showToast("Đã gửi video thành công", "success");
    });
  };

  // Local Photo Upload (File goes straight to the presigned uploader)
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleSendPhotoFile(file);
  };

  // Local Video Upload
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleSendVideoFile(file);
  };

  const handleRetrySend = (p: PendingSend) => {
    void runSend(p);
  };

  const handleDiscardSend = (p: PendingSend) => {
    if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    setPendingSends((prev) => prev.filter((x) => x.clientId !== p.clientId));
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
    setInputText(msg.text || "");
    setActiveActionMenuMsgId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCopyMessage = (msg: Message) => {
    const textToCopy = msg.text || msg.imageUrl || msg.videoUrl || "";
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      showToast("Đã sao chép nội dung tin nhắn", "success");
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
      showToast(`Đã chặn ${partnerUser.name}`, "info");
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
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.trim().toLowerCase() ? (
            <mark key={index} className="rounded-xs bg-amber-300 px-0.5 font-bold text-slate-900">
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </>
    );
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50 select-none dark:bg-slate-950">
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
      <div className="z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3.5 py-2.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Left: Back + Avatar + Name (Tapping avatar/name opens Profile) */}
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={onBack}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Quay lại"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div
            onClick={() => {
              if (!conversation.isGroup && partnerUser) {
                setSelectedUser(partnerUser);
              }
            }}
            className={`relative shrink-0 ${!conversation.isGroup && partnerUser ? "group cursor-pointer" : ""}`}
            title={!conversation.isGroup && partnerUser ? `Xem hồ sơ ${partner.name}` : undefined}
          >
            <Avatar
              src={conversation.isGroup ? conversation.avatar : partner.avatar}
              name={conversation.name || partner.name}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-emerald-500/20 transition-all group-hover:ring-emerald-600"
            />
            {!conversation.isGroup && conversation.isOnline && (
              <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            )}
            {conversation.isGroup && (
              <span
                title="Nhóm trò chuyện"
                className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-xs dark:border-slate-900"
              >
                <Users className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          <div
            onClick={() => {
              if (!conversation.isGroup && partnerUser) {
                setSelectedUser(partnerUser);
              }
            }}
            className={`min-w-0 ${!conversation.isGroup && partnerUser ? "group cursor-pointer" : ""}`}
          >
            <div className="truncate text-xs leading-tight font-bold whitespace-nowrap text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-slate-100 dark:group-hover:text-emerald-400">
              {conversation.isGroup ? conversation.name : partner.name}
            </div>
            <div className="mt-0.5 truncate text-[10px] whitespace-nowrap text-slate-400 dark:text-slate-500">
              {conversation.isGroup
                ? groupTypingText ||
                  `${conversation.memberCount || memberDtos.length || "?"} thành viên`
                : isPartnerTyping
                  ? "Đang soạn tin..."
                  : convIsGroup === false && conversation.isOnline
                    ? "Đang hoạt động"
                    : "Không hoạt động"}
            </div>
          </div>
        </div>

        {/* Right Header Actions: Distinct for Direct vs Group */}
        {conversation.isGroup ? (
          /* GROUP CHAT ACTIONS: SEARCH MSG & GROUP SETTINGS */
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-colors ${
                isSearchOpen
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
              title="Tìm kiếm tin nhắn trong nhóm"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowGroupSettings(true)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
              title="Cài đặt nhóm (Ảnh, Tên, Quyền riêng tư, Thành viên)"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* DIRECT MESSAGE ACTIONS: SEARCH MSG, VIDEO CALL, BLOCK CHAT
             Hidden call/block while blocked — blocked bar below owns the state. */
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-colors ${
                isSearchOpen
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
              title="Tìm kiếm tin nhắn"
            >
              <Search className="h-4 w-4" />
            </button>

            {!conversation.isBlocked && (
              <>
                <button
                  onClick={() => partnerUser && startCall(partnerUser, true)}
                  disabled={!partnerUser}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-emerald-600 disabled:cursor-wait disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
                  title="Gọi video"
                >
                  <Video className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setShowBlockConfirm(true)}
                  disabled={!partnerUser}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-40 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  title="Chặn cuộc trò chuyện"
                >
                  <Ban className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* SEARCH MESSAGE SLIDE-DOWN BAR */}
      {isSearchOpen && (
        <form
          onSubmit={handleSearchSubmit}
          className="animate-in slide-in-from-top-2 z-10 flex shrink-0 items-center gap-2 border-b border-emerald-100 bg-white px-3.5 py-2 shadow-xs dark:border-emerald-500/20 dark:bg-slate-900"
        >
          <Search className="h-4 w-4 shrink-0 text-emerald-600" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm nội dung tin nhắn..."
            className="flex-1 rounded-xl border border-transparent bg-slate-100 px-3 py-1.5 text-xs focus:border-emerald-300 focus:bg-white focus:outline-none dark:bg-slate-800 dark:focus:bg-slate-800"
          />
          {isSearching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600" />
          ) : searchMode && highlightQuery ? (
            <span className="max-w-[120px] shrink-0 truncate text-[11px] font-bold text-emerald-600">
              “{highlightQuery}”
            </span>
          ) : null}
          <button
            type="button"
            onClick={closeSearch}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </form>
      )}

      {/* MESSAGES STREAM */}
      <div
        ref={listRef}
        className="no-scrollbar flex-1 space-y-3.5 overflow-y-auto p-4"
        onScroll={handleListScroll}
        onClick={() => {
          setActiveDrawer(null);
          setActiveActionMenuMsgId(null);
        }}
      >
        {isLoadingOlder && (
          <div className="flex justify-center py-2">
            <LogoLoader size="sm" text={null} />
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const sender = isMe
            ? currentUser
            : msg.senderName
              ? emptyUser(msg.senderId, msg.senderName, msg.senderAvatar || "")
              : currentUser;
          const isMenuOpen = activeActionMenuMsgId === msg.id;

          // Check if message references a moment (feed page or on-demand cache)
          const momentData = msg.momentId
            ? (moments.find((m) => m.id === msg.momentId) ??
              extraMoments.find((m) => m.id === msg.momentId))
            : null;

          // System messages render as a centered neutral pill — no avatar,
          // bubble, or actions.
          if (msg.renderType === "System") {
            return (
              <div key={msg.id} data-msg-id={msg.id} className="flex justify-center">
                <div className="max-w-[85%] rounded-full bg-slate-200/70 px-3 py-1.5 text-center text-[11px] leading-relaxed font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {msg.text || "Thông báo hệ thống"}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              data-msg-id={msg.id}
              className={`relative flex flex-col rounded-2xl transition-colors ${isMe ? "items-end" : "items-start"} ${
                highlightedId === msg.id
                  ? "-mx-1 bg-emerald-50/70 px-1 py-0.5 ring-2 ring-emerald-500"
                  : ""
              }`}
            >
              {/* SENDER NAME & AVATAR (SHOWS FOR ALL RECEIVED MESSAGES, TAP TO VIEW PROFILE) */}
              {!isMe && (
                <div
                  onClick={() => setSelectedUser(sender)}
                  className="group/sender mb-1 ml-0.5 flex cursor-pointer items-center gap-1.5 select-none"
                  title={`Xem hồ sơ của ${sender.name}`}
                >
                  <Avatar
                    src={sender.avatar}
                    name={sender.name}
                    className="h-5 w-5 rounded-full object-cover ring-1 ring-slate-200 transition-all group-hover/sender:ring-emerald-600 dark:ring-white/10"
                    textClassName="text-[8px]"
                  />
                  <span className="text-[11px] font-bold text-slate-700 transition-colors group-hover/sender:text-emerald-600 dark:text-slate-300 dark:group-hover/sender:text-emerald-400">
                    {sender.name}
                  </span>
                  {conversation.isGroup &&
                    adminUserId != null &&
                    Number(msg.senderId) === adminUserId && (
                      <span
                        title="Quản trị viên"
                        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white"
                      >
                        <ShieldCheck className="h-2.5 w-2.5" />
                      </span>
                    )}
                </div>
              )}

              <div className="relative flex max-w-[88%] items-end gap-1.5">
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
                      className={`mb-1 max-w-full min-w-0 cursor-pointer rounded-xl border-l-3 px-2.5 py-1.5 text-[11px] transition-all hover:opacity-80 active:scale-98 ${
                        isMe
                          ? "border-emerald-300 bg-emerald-700/30 text-emerald-50"
                          : "border-emerald-500 bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                      title="Chạm để xem tin nhắn gốc"
                    >
                      <div className="flex min-w-0 items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <Reply className="h-2.5 w-2.5 shrink-0" />
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {msg.replyTo.senderName}
                        </span>
                      </div>

                      <p className="mt-0.5 min-w-0 text-[10px] [overflow-wrap:anywhere] whitespace-pre-wrap opacity-90">
                        {msg.replyTo.mediaType === "gif"
                          ? "[GIF]"
                          : msg.replyTo.mediaType === "video"
                            ? "[Video]"
                            : msg.replyTo.mediaType === "image"
                              ? "[Hình ảnh]"
                              : msg.replyTo.mediaType === "moment"
                                ? "[Khoảnh khắc]"
                                : msg.replyTo.mediaType === "location"
                                  ? "[Vị trí]"
                                  : msg.replyTo.text || "[Tin nhắn]"}
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
                          type: "image",
                          senderName: sender.name,
                          timestamp: msg.timestamp,
                          caption: msg.text,
                        });
                      }}
                      className="group/media relative mb-1 max-w-[220px] cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs dark:border-slate-700"
                    >
                      <img
                        src={msg.imageUrl}
                        alt="Attached media"
                        referrerPolicy="no-referrer"
                        className="h-auto max-h-56 w-full object-cover transition-opacity hover:opacity-95"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover/media:bg-black/25 group-hover/media:opacity-100">
                        <div className="flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-bold text-white shadow-md backdrop-blur-xs">
                          <Download className="h-3 w-3" />
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
                          type: "video",
                          senderName: sender.name,
                          timestamp: msg.timestamp,
                          caption: msg.text,
                        });
                      }}
                      className="group/video relative mb-1 max-w-[240px] cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-black shadow-xs dark:border-slate-700"
                    >
                      <video
                        src={msg.videoUrl}
                        playsInline
                        className="pointer-events-none h-auto max-h-56 w-full rounded-2xl object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-emerald-600 shadow-lg transition-transform group-hover/video:scale-110">
                          <Play className="ml-0.5 h-5 w-5 fill-emerald-600" />
                        </div>
                      </div>
                      <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                        <Download className="h-2.5 w-2.5" />
                        <span>Xem & Tải</span>
                      </div>
                    </div>
                  )}

                  {/* 3. MOMENT CARD: DESC & LOCATION OVERLAP (ON TOP) OF THE MOMENT MEDIA */}
                  {msg.momentId &&
                    (momentData ? (
                      <div
                        onClick={(e) => {
                          if (isLongPressRef.current) return;
                          e.stopPropagation();
                          setSelectedMoment(momentData);
                        }}
                        className="group/moment relative mb-1.5 aspect-[4/3] w-64 max-w-[260px] cursor-pointer overflow-hidden rounded-2xl border border-slate-200 shadow-md"
                      >
                        {/* Moment Media */}
                        <img
                          src={momentData.imageUrl}
                          alt={momentData.caption}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover/moment:scale-105"
                        />

                        {/* Video Play Overlay Icon if video */}
                        {momentData.mediaType === "video" && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-emerald-600 shadow-lg">
                              <Play className="ml-0.5 h-5 w-5 fill-emerald-600" />
                            </div>
                          </div>
                        )}

                        {/* Top Badge: Camera + Khoảnh khắc & Time ago */}
                        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                            <Camera className="h-3 w-3 text-emerald-400" />
                            <span>Khoảnh khắc</span>
                          </div>
                          <div className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-medium text-white">
                            {momentData.timeAgo}
                          </div>
                        </div>

                        {/* BOTTOM OVERLAY: DESC & LOCATION OVERLAP ON TOP OF MEDIA */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8 text-white">
                          {momentData.caption && (
                            <p className="mb-1 line-clamp-2 text-xs leading-snug font-semibold text-white drop-shadow-xs">
                              {momentData.caption}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-[11px] font-medium text-white/90">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                            <span className="truncate">{momentData.locationName}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-1 rounded-2xl border border-slate-200 bg-slate-100 p-2.5 text-[11px] text-slate-400 italic dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                        Khoảnh khắc không khả dụng hoặc đã hết hạn
                      </div>
                    ))}

                  {/* 4. LOCATION PIN SHARE */}
                  {msg.locationPin && (
                    <div className="mb-1 flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          Vị trí chia sẻ
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {msg.locationPin.name}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-emerald-600">
                          Đã chia sẻ tọa độ GPS
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DELETED (TOMBSTONE) MESSAGE */}
                  {msg.isDeleted && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-[11px] text-slate-400 italic dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                      Tin nhắn đã bị xóa
                    </div>
                  )}

                  {/* 5. TEXT BUBBLE WITH SEARCH-TERM HIGHLIGHT */}
                  {msg.text && (
                    <div
                      className={`relative max-w-full rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-all shadow-xs ${
                        isMe
                          ? "rounded-br-xs bg-emerald-600 text-white"
                          : "rounded-bl-xs border border-slate-100 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {renderHighlightedText(msg.text, highlightQuery)}
                    </div>
                  )}

                  {/* REACTIONS DISPLAY */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div
                      className={`mt-0.5 flex items-center gap-0.5 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {msg.reactions.map((r, rIdx) => (
                        <button
                          key={rIdx}
                          onClick={() => handleReact(msg.id, r.emoji)}
                          className="py-0.2 cursor-pointer rounded-full border border-slate-100 bg-white px-1.5 text-[10px] shadow-xs transition-transform hover:scale-110 dark:border-slate-700 dark:bg-slate-800"
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
                      className={`absolute -top-12 ${isMe ? "right-0" : "left-0"} animate-in fade-in zoom-in-95 z-30 flex min-w-[200px] flex-col gap-1 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl duration-150 dark:border-slate-700 dark:bg-slate-800`}
                    >
                      {/* EMOJI REACTION QUICK BAR */}
                      <div className="flex items-center justify-between border-b border-slate-100 px-1 py-1 dark:border-slate-800">
                        {QUICK_REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center text-sm transition-transform hover:scale-130"
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
                          className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <Reply className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Trả lời</span>
                        </button>

                        <button
                          onClick={() => handleCopyMessage(msg)}
                          className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Sao chép</span>
                        </button>

                        {isMe && msg.text && (
                          <button
                            onClick={() => handleStartEdit(msg)}
                            className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-amber-600" />
                            <span>Chỉnh sửa</span>
                          </button>
                        )}

                        {isMe && (
                          <button
                            onClick={() => setConfirmDeleteId(msg.id)}
                            className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            <span>Xóa tin nhắn</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp, Edited badge & Status */}
              <div
                className={`mt-0.5 flex items-center gap-1 px-1 text-[9px] text-slate-400 dark:text-slate-500 ${isMe ? "justify-end" : "justify-start"}`}
              >
                <span>{msg.timestamp}</span>
                {isMe && (
                  <span>
                    {msg.status === "read" ? (
                      <CheckCheck className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Check className="h-3 w-3 text-slate-400 dark:text-slate-500" />
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
                  <video
                    src={p.previewUrl}
                    playsInline
                    className="max-h-40 rounded-2xl border border-slate-200"
                  />
                  {p.status === "sending" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30">
                      <LoadingSpinner size="md" light />
                    </div>
                  )}
                </div>
              )}
              {p.previewUrl && p.image && (
                <div className="relative mb-1">
                  <img
                    src={p.previewUrl}
                    alt="Đang gửi"
                    className="max-h-40 rounded-2xl border border-slate-200 object-cover"
                  />
                  {p.status === "sending" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30">
                      <LoadingSpinner size="md" light />
                    </div>
                  )}
                </div>
              )}
              {p.text && (
                <div className="max-w-[88%] rounded-2xl rounded-br-xs bg-emerald-600 px-3.5 py-2.5 text-xs leading-relaxed text-white shadow-xs">
                  {p.text}
                </div>
              )}
              {p.status === "sending" ? (
                // Media shows the overlay above instead of this text row.
                isMediaPreview ? null : (
                  <span className="mt-0.5 animate-pulse px-1 text-[9px] text-slate-400 dark:text-slate-500">
                    Đang gửi...
                  </span>
                )
              ) : (
                <div className="mt-0.5 flex items-center gap-1.5 px-1">
                  <AlertCircle className="h-3 w-3 text-rose-500" />
                  <span className="text-[9px] font-semibold text-rose-500">Gửi thất bại</span>
                  <button
                    onClick={() => handleRetrySend(p)}
                    className="cursor-pointer text-[9px] font-bold text-emerald-600 hover:underline"
                  >
                    Thử lại
                  </button>
                  <button
                    onClick={() => handleDiscardSend(p)}
                    className="cursor-pointer text-[9px] font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    Xóa
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* TYPING INDICATOR — animated dots bubble while partner(s) type */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="flex flex-col items-start">
            {!convIsGroup || Object.keys(typingUsers).length > 1 ? null : (
              <span className="mb-1 ml-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {typingNames[0]}
              </span>
            )}
            {convIsGroup && Object.keys(typingUsers).length > 1 ? (
              <span className="mb-1 ml-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {typingNames.length} người đang soạn tin...
              </span>
            ) : null}
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-xs border border-slate-100 bg-white px-3.5 py-3 shadow-xs dark:border-slate-700 dark:bg-slate-800">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms] dark:bg-slate-500" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms] dark:bg-slate-500" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms] dark:bg-slate-500" />
              <span className="sr-only">Đang soạn tin...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 1. EMOJI BOTTOM SHEET */}
      {activeDrawer === "emoji" && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs duration-150"
          onClick={() => setActiveDrawer(null)}
        >
          <div
            className="animate-in slide-in-from-bottom-8 mx-auto flex max-h-[65dvh] w-full flex-col rounded-t-[32px] border-x border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl duration-200 sm:max-w-md dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Biểu tượng cảm xúc (Emoji)
              </span>
              <button
                onClick={() => setActiveDrawer(null)}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="no-scrollbar space-y-3 overflow-y-auto">
              {EMOJI_CATEGORIES.map((cat, catIdx) => (
                <div key={catIdx}>
                  <div className="mb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                    {cat.title}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center sm:grid-cols-8">
                    {cat.emojis.map((emoji, eIdx) => (
                      <button
                        key={eIdx}
                        type="button"
                        onClick={() => setInputText((prev) => prev + emoji)}
                        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-2xl transition-transform hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-800"
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
      {activeDrawer === "gif" && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs duration-150"
          onClick={() => setActiveDrawer(null)}
        >
          <div
            className="animate-in slide-in-from-bottom-8 mx-auto flex h-[65dvh] w-full flex-col rounded-t-[32px] border-x border-t border-slate-100 bg-white p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-2xl duration-200 sm:max-w-md dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-black tracking-widest text-white">
                  GIPHY
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tìm kiếm ảnh động
                </span>
              </div>
              <button
                onClick={() => setActiveDrawer(null)}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative mb-2">
              <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={gifSearch}
                onChange={(e) => setGifSearch(e.target.value)}
                placeholder="Tìm kiếm GIF theo từ khóa..."
                className="w-full rounded-xl border border-transparent bg-slate-100 py-1.5 pr-3 pl-8 text-xs focus:border-emerald-300 focus:bg-white focus:outline-none dark:bg-slate-800 dark:focus:bg-slate-800"
              />
            </div>

            <div className="no-scrollbar mb-2 flex items-center gap-1 overflow-x-auto py-0.5">
              {[
                { id: "all", label: "Tất cả" },
                { id: "party", label: "Tiệc tùng" },
                { id: "happy", label: "Vui vẻ" },
                { id: "love", label: "Thả tim" },
                { id: "haha", label: "Cười bò" },
                { id: "wow", label: "Kinh ngạc" },
              ].map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedGifTag(tag.id)}
                  className={`shrink-0 cursor-pointer truncate rounded-xl px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors ${
                    selectedGifTag === tag.id
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>

            <div className="no-scrollbar grid flex-1 grid-cols-3 content-start gap-2 overflow-y-auto">
              {isLoadingGifs ? (
                <div className="col-span-3 animate-pulse py-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
                  Đang tìm GIF...
                </div>
              ) : gifItems.length === 0 ? (
                <div className="col-span-3 py-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
                  Không tìm thấy GIF phù hợp
                </div>
              ) : (
                gifItems.map((gif, idx) => (
                  <button
                    key={`${gif.id}-${idx}`}
                    onClick={() => handleSendGif(gif.url)}
                    className="group relative h-24 w-full shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition-all hover:ring-2 hover:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <img
                      src={gif.thumbUrl || gif.url}
                      alt="GIF"
                      referrerPolicy="no-referrer"
                      draggable={false}
                      loading="lazy"
                      className="block h-full w-full object-cover transition-transform group-hover:scale-105"
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
        <div className="animate-in slide-in-from-bottom-2 z-10 flex items-center justify-between border-t border-emerald-100 bg-emerald-50/95 px-3.5 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <Reply className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <span className="block truncate text-[10px] font-bold text-emerald-700">
                Đang trả lời{" "}
                {replyingTo.senderId === currentUser.id
                  ? "chính bạn"
                  : replyingTo.senderName || partner.name}
              </span>
              <span className="block truncate text-[11px] text-slate-600 dark:text-slate-400">
                {replyingTo.mediaType === "gif"
                  ? "[GIF]"
                  : replyingTo.mediaType === "video"
                    ? "[Video]"
                    : replyingTo.mediaType === "image"
                      ? "[Hình ảnh]"
                      : replyingTo.text || "[Tin nhắn]"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-emerald-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-emerald-500/20 dark:hover:text-slate-300"
            title="Hủy trả lời"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* FLOATING EDIT BANNER ABOVE INPUT */}
      {editingMessage && (
        <div className="animate-in slide-in-from-bottom-2 z-10 flex items-center justify-between border-t border-amber-100 bg-amber-50/95 px-3.5 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <Edit2 className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <span className="block text-[10px] font-bold text-amber-700">
                Đang chỉnh sửa tin nhắn
              </span>
              <span className="block truncate text-[11px] text-slate-600 dark:text-slate-400">
                {editingMessage.text}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setInputText("");
            }}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-amber-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-amber-500/20 dark:hover:text-slate-300"
            title="Hủy chỉnh sửa"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* SCROLL TO BOTTOM — icon only; in a search window it reloads live */}
      {(showScrollBottom || searchMode) && (
        <div className="animate-in fade-in zoom-in-95 absolute right-3 bottom-24 z-20">
          <button
            onClick={() => {
              if (searchMode) {
                reloadToLatest();
                return;
              }
              stickToBottomRef.current = true;
              setShowScrollBottom(false);
              const el = listRef.current;
              if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            }}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-600 shadow-xl transition-all hover:bg-emerald-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            title={searchMode ? "Về tin nhắn mới nhất" : "Xuống cuối"}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* PENDING SHARED MOMENT CHIP (?momentId=) ABOVE THE INPUT */}
      {pendingMoment && !conversation.isBlocked && !editingMessage && (
        <div className="animate-in slide-in-from-bottom-2 z-10 flex items-center justify-between gap-2 border-t border-emerald-100 bg-emerald-50/95 px-3.5 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={pendingMoment.imageUrl}
              alt={pendingMoment.caption}
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-lg border border-emerald-200 object-cover shadow-xs"
            />
            <div className="min-w-0">
              <span className="block text-[10px] font-bold text-emerald-700">
                Khoảnh khắc đính kèm
              </span>
              <span className="block truncate text-[11px] text-slate-600 dark:text-slate-400">
                {pendingMoment.caption || "Nhấn gửi để chia sẻ khoảnh khắc"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingMoment(null)}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-emerald-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-emerald-500/20 dark:hover:text-slate-300"
            title="Bỏ đính kèm khoảnh khắc"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* BLOCKED CONVERSATION BAR — replaces the composer while blocked */}
      {conversation.isBlocked && (
        <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Ban className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                {conversation.blockedById === Number(currentUser.id)
                  ? `Bạn đã chặn ${partner.name}`
                  : "Cuộc trò chuyện đã bị chặn"}
              </div>
              <div className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                {conversation.blockedById === Number(currentUser.id)
                  ? "Bỏ chặn để tiếp tục gửi tin nhắn"
                  : "Bạn không thể gửi tin nhắn lúc này"}
              </div>
            </div>
          </div>
          {conversation.blockedById === Number(currentUser.id) && (
            <button
              onClick={handleUnblock}
              disabled={!partnerUser}
              className="shrink-0 cursor-pointer rounded-xl bg-emerald-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40"
            >
              Bỏ chặn
            </button>
          )}
        </div>
      )}

      {/* COMPOSER BOTTOM INPUT BAR: INLINE APPEND LIST ON '+' TAP, SHRINKS INPUT BOX */}
      {!conversation.isBlocked && (
        <form
          onSubmit={handleSend}
          className="z-10 flex shrink-0 items-center gap-1.5 border-t border-slate-100 bg-white p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900"
        >
          {/* LEFT SIDE TOOLS: EMOJI, PLUS (TOGGLES INLINE EXPANSION: PHOTO, VIDEO, LOCATION, GIF) */}
          <div className="flex shrink-0 items-center gap-1 transition-all duration-200">
            {/* 1. EMOJI BUTTON */}
            <button
              type="button"
              onClick={() => setActiveDrawer(activeDrawer === "emoji" ? null : "emoji")}
              className={`cursor-pointer rounded-xl p-2 transition-all ${
                activeDrawer === "emoji"
                  ? "bg-amber-100 text-amber-700 shadow-xs"
                  : "text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-amber-300"
              }`}
              title="Biểu tượng cảm xúc (Emoji)"
            >
              <Smile className="h-4 w-4" />
            </button>

            {/* 2. PLUS BUTTON (EXPANDS INLINE LIST WITHOUT POPOVER) */}
            <button
              type="button"
              onClick={() => setIsToolsExpanded(!isToolsExpanded)}
              className={`cursor-pointer rounded-xl p-2 transition-all ${
                isToolsExpanded
                  ? "rotate-45 bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
              }`}
              title={
                isToolsExpanded ? "Thu gọn công cụ" : "Mở rộng công cụ (Ảnh, Video, Vị trí, GIF)"
              }
            >
              <Plus className="h-4 w-4 transition-transform duration-200" />
            </button>

            {/* INLINE EXPANDED TOOLS (PHOTO, VIDEO, LOCATION, GIF) */}
            {isToolsExpanded && (
              <div className="animate-in fade-in zoom-in-95 flex items-center gap-1 duration-150">
                {/* Photo Upload */}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="cursor-pointer rounded-xl p-2 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300"
                  title="Gửi ảnh từ thiết bị"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>

                {/* Video Upload */}
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="cursor-pointer rounded-xl p-2 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300"
                  title="Gửi video từ thiết bị"
                >
                  <Video className="h-4 w-4" />
                </button>

                {/* GIF Search */}
                <button
                  type="button"
                  onClick={() => setActiveDrawer(activeDrawer === "gif" ? null : "gif")}
                  className={`cursor-pointer rounded-xl px-2 py-1 text-[10px] font-black tracking-wider transition-all ${
                    activeDrawer === "gif"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300"
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
            placeholder={
              editingMessage
                ? "Cập nhật nội dung..."
                : replyingTo
                  ? "Nhập câu trả lời..."
                  : "Nhập tin nhắn..."
            }
            className="min-w-[80px] flex-1 rounded-2xl border border-transparent bg-slate-100 px-3.5 py-2 text-xs text-slate-800 transition-all placeholder:text-slate-400 hover:bg-slate-200/50 focus:border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:hover:bg-slate-700/50 dark:focus:border-slate-600 dark:focus:bg-slate-800"
          />

          {/* Send / Update Button */}
          <button
            type="submit"
            disabled={!inputText.trim() && !pendingMoment}
            className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-2xl text-white shadow-md transition-all active:scale-95 disabled:opacity-30 ${
              editingMessage
                ? "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600"
                : "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700"
            }`}
            title={editingMessage ? "Lưu thay đổi" : "Gửi tin nhắn"}
          >
            {editingMessage ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
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
        <MomentViewerModal moment={selectedMoment} onClose={() => setSelectedMoment(null)} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="animate-in zoom-in-95 w-full max-w-xs rounded-3xl bg-white p-5 text-center shadow-2xl dark:bg-slate-900">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Ban className="h-6 w-6" />
            </div>
            <h4 className="mb-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              Chặn {partnerUser?.name || partner.name}?
            </h4>
            <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Bạn sẽ không nhận được tin nhắn từ người này trong cuộc trò chuyện cho đến khi bỏ
              chặn.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 cursor-pointer rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmBlock}
                className="flex-1 cursor-pointer rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-rose-700"
              >
                Chặn cuộc trò chuyện
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MESSAGE DIALOG */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="animate-in zoom-in-95 w-full max-w-xs rounded-2xl bg-white p-4.5 text-center shadow-2xl dark:bg-slate-900">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <h4 className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              Xóa tin nhắn?
            </h4>
            <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Tin nhắn này sẽ bị xóa khỏi cuộc trò chuyện.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 cursor-pointer rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteMessage(confirmDeleteId)}
                className="flex-1 cursor-pointer rounded-xl bg-rose-600 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700"
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
