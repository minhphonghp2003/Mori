import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MediaViewerModal } from '../common/MediaViewerModal';
import { MomentViewerModal } from '../moments/MomentViewerModal';
import { GroupSettingsModal } from './GroupSettingsModal';
import { Message, Moment } from '../../types';
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
  Upload,
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
  Plus
} from 'lucide-react';

interface ChatRoomViewProps {
  conversationId: string;
  onBack: () => void;
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

const GIPHY_ITEMS = [
  { id: '1', title: 'Cheers Toast', tag: 'party', url: 'https://media.giphy.com/media/BPJmthQ3YRwD6QqcVD/giphy.gif' },
  { id: '2', title: 'Happy Dance Cat', tag: 'happy', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif' },
  { id: '3', title: 'Minions Yay', tag: 'party', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: '4', title: 'Love Heart', tag: 'love', url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif' },
  { id: '5', title: 'LOL Laughing', tag: 'haha', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
  { id: '6', title: 'Cute Dog', tag: 'love', url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif' },
  { id: '7', title: 'High Five', tag: 'happy', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
  { id: '8', title: 'Mind Blown', tag: 'wow', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: '9', title: 'Thumbs Up OK', tag: 'ok', url: 'https://media.giphy.com/media/3o7absbD7PbTFQa0c8/giphy.gif' },
  { id: '10', title: 'Bye Wave', tag: 'bye', url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif' },
  { id: '11', title: 'Dance Party', tag: 'party', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
  { id: '12', title: 'Wow Cat', tag: 'wow', url: 'https://media.giphy.com/media/udmx3pgdiD7gY/giphy.gif' }
];

const QUICK_REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

type DrawerType = 'emoji' | 'gif' | null;

export const ChatRoomView: React.FC<ChatRoomViewProps> = ({ conversationId, onBack }) => {
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
    blockFriend,
    setSelectedUser,
    showToast 
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [selectedGifTag, setSelectedGifTag] = useState<string>('all');
  
  // In-chat search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
  const messages = messagesMap[conversationId] || [];

  // Partner for 1:1 chat
  const partner = conversation?.participants.find(p => p.id !== currentUser.id) || currentUser;

  // Auto focus search input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isSearchOpen]);

  // Auto scroll to latest message
  useEffect(() => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeDrawer, replyingTo, editingMessage, searchQuery]);

  // Filter messages based on search query
  const matchedMessageIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    return new Set(
      messages
        .filter(m => m.text?.toLowerCase().includes(q))
        .map(m => m.id)
    );
  }, [messages, searchQuery]);

  if (!conversation) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Không tìm thấy cuộc trò chuyện.
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (editingMessage) {
      editMessage(conversationId, editingMessage.id, inputText.trim());
      setEditingMessage(null);
      setInputText('');
    } else {
      const replyData = replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderId === currentUser.id 
          ? currentUser.name 
          : (conversation.participants.find(p => p.id === replyingTo.senderId)?.name || 'Bạn bè'),
        text: replyingTo.text,
        imageUrl: replyingTo.imageUrl
      } : undefined;

      sendMessage(
        conversationId, 
        inputText.trim(), 
        undefined, 
        undefined, 
        undefined, 
        replyData
      );
      setReplyingTo(null);
      setInputText('');
    }

    setActiveDrawer(null);
  };

  const handleSendImage = (imgUrl: string) => {
    sendMessage(conversationId, undefined, imgUrl);
    setActiveDrawer(null);
    showToast('Đã gửi ảnh thành công 📷', 'success');
  };

  const handleSendVideo = (videoUrl: string) => {
    sendMessage(conversationId, undefined, undefined, undefined, videoUrl);
    setActiveDrawer(null);
    showToast('Đã gửi video thành công 🎥', 'success');
  };

  const handleSendGif = (gifUrl: string) => {
    sendMessage(conversationId, undefined, gifUrl);
    setActiveDrawer(null);
    showToast('Đã gửi GIF từ Giphy ✨', 'success');
  };

  const handleSendLocation = () => {
    sendMessage(conversationId, undefined, undefined, {
      lat: currentUser.location.lat,
      lng: currentUser.location.lng,
      name: currentUser.location.address
    });
    showToast('Đã gửi vị trí hiện tại 📍', 'success');
  };

  // Local Photo Upload
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleSendImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Local Video Upload
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleSendVideo(result);
      }
    };
    reader.readAsDataURL(file);
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

  const handleConfirmBlock = () => {
    blockFriend(partner.id);
    setShowBlockConfirm(false);
    showToast(`Đã chặn ${partner.name} thành công`, 'info');
    onBack();
  };

  // Highlight search results in messages
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
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

  // Filter GIFs
  const filteredGifs = GIPHY_ITEMS.filter(gif => {
    const matchesSearch = gif.title.toLowerCase().includes(gifSearch.toLowerCase());
    const matchesTag = selectedGifTag === 'all' || gif.tag === selectedGifTag;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-50 overflow-hidden select-none">
      
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
      <div className="shrink-0 bg-white border-b border-slate-100 px-3.5 py-2.5 flex items-center justify-between shadow-xs z-10">
        
        {/* Left: Back + Avatar + Name (Tapping avatar/name opens Profile) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
            title="Quay lại"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div 
            onClick={() => {
              if (!conversation.isGroup) {
                setSelectedUser(partner);
              }
            }}
            className={`relative shrink-0 ${!conversation.isGroup ? 'cursor-pointer group' : ''}`}
            title={!conversation.isGroup ? `Xem hồ sơ ${partner.name}` : undefined}
          >
            <img
              src={conversation.isGroup ? conversation.avatar : partner.avatar}
              alt={conversation.name || partner.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20 group-hover:ring-indigo-600 transition-all"
            />
            {!conversation.isGroup && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div 
            onClick={() => {
              if (!conversation.isGroup) {
                setSelectedUser(partner);
              }
            }}
            className={`min-w-0 ${!conversation.isGroup ? 'cursor-pointer group' : ''}`}
          >
            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 leading-tight truncate whitespace-nowrap transition-colors">
              {conversation.isGroup ? conversation.name : partner.name}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate whitespace-nowrap">
              {conversation.isGroup
                ? `${conversation.participants.length} thành viên`
                : 'Đang hoạt động • Chạm để xem hồ sơ'}
            </div>
          </div>
        </div>

        {/* Right Header Actions: Distinct for Direct vs Group */}
        {conversation.isGroup ? (
          /* GROUP CHAT ACTIONS: SEARCH MSG & GROUP SETTINGS */
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isSearchOpen ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Tìm kiếm tin nhắn trong nhóm"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowGroupSettings(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cài đặt nhóm (Ảnh, Tên, Quyền riêng tư, Thành viên)"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* DIRECT MESSAGE ACTIONS: SEARCH MSG, CALLING (VOICE & VIDEO), BLOCK CHAT */
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isSearchOpen ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Tìm kiếm tin nhắn"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => startCall(partner, false)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Gọi thoại"
            >
              <Phone className="w-4 h-4" />
            </button>

            <button
              onClick={() => startCall(partner, true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Gọi video"
            >
              <Video className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowBlockConfirm(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Chặn cuộc trò chuyện & quan hệ bạn bè"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* SEARCH MESSAGE SLIDE-DOWN BAR */}
      {isSearchOpen && (
        <div className="shrink-0 bg-white border-b border-indigo-100 px-3.5 py-2 flex items-center gap-2 animate-in slide-in-from-top-2 shadow-xs z-10">
          <Search className="w-4 h-4 text-indigo-600 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm nội dung tin nhắn..."
            className="flex-1 text-xs bg-slate-100 border border-transparent focus:border-indigo-300 focus:bg-white rounded-xl px-3 py-1.5 focus:outline-none"
          />
          {searchQuery && (
            <span className="text-[11px] font-bold text-indigo-600 shrink-0">
              {matchedMessageIds.size} kết quả
            </span>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MESSAGES STREAM */}
      <div 
        className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5"
        onClick={() => {
          setActiveDrawer(null);
          setActiveActionMenuMsgId(null);
        }}
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const sender = conversation.participants.find(p => p.id === msg.senderId) || currentUser;
          const isMenuOpen = activeActionMenuMsgId === msg.id;
          const isMatched = searchQuery.trim() ? matchedMessageIds.has(msg.id) : false;

          // Check if message references a moment
          const momentData = msg.momentId ? moments.find(m => m.id === msg.momentId) : null;

          return (
            <div
              key={msg.id}
              className={`flex flex-col relative ${isMe ? 'items-end' : 'items-start'} ${
                searchQuery.trim() && !isMatched ? 'opacity-40' : ''
              }`}
            >
              {/* SENDER NAME & AVATAR (SHOWS FOR ALL RECEIVED MESSAGES, TAP TO VIEW PROFILE) */}
              {!isMe && (
                <div 
                  onClick={() => setSelectedUser(sender)}
                  className="flex items-center gap-1.5 mb-1 ml-0.5 cursor-pointer group/sender select-none"
                  title={`Xem hồ sơ của ${sender.name}`}
                >
                  <img
                    src={sender.avatar}
                    alt={sender.name}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 group-hover/sender:ring-indigo-600 transition-all"
                  />
                  <span className="text-[11px] font-bold text-slate-700 group-hover/sender:text-indigo-600 transition-colors">
                    {sender.name}
                  </span>
                  {conversation.isGroup && conversation.adminId === sender.id && (
                    <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded-xs border border-amber-200">
                      Admin
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
                  
                  {/* QUOTE / REPLY PREVIEW IN BUBBLE */}
                  {msg.replyTo && (
                    <div 
                      className={`mb-1 px-2.5 py-1.5 rounded-xl text-[11px] border-l-3 max-w-full ${
                        isMe 
                          ? 'border-indigo-300 bg-indigo-700/30 text-indigo-50' 
                          : 'border-indigo-500 bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-[10px] text-indigo-400 flex items-center gap-1">
                        <Reply className="w-2.5 h-2.5" />
                        <span>{msg.replyTo.senderName}</span>
                      </div>
                      <p className="truncate text-[10px] opacity-90 mt-0.5">
                        {msg.replyTo.text || '[Hình ảnh/Phương tiện]'}
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
                      className="rounded-2xl overflow-hidden mb-1 border border-slate-200/80 shadow-xs max-w-[220px] bg-slate-100 cursor-pointer relative group/media"
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
                      className="rounded-2xl overflow-hidden mb-1 border border-slate-200/80 shadow-xs max-w-[240px] bg-black cursor-pointer relative group/video"
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
                      <div className="p-2.5 bg-slate-100 rounded-2xl border border-slate-200 text-[11px] text-slate-400 italic mb-1">
                        Khoảnh khắc không khả dụng hoặc đã hết hạn
                      </div>
                    )
                  )}

                  {/* 4. LOCATION PIN SHARE */}
                  {msg.locationPin && (
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-1 flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400">Vị trí chia sẻ</div>
                        <div className="text-xs font-bold text-slate-800">{msg.locationPin.name}</div>
                        <div className="text-[11px] text-emerald-600 font-bold mt-1">
                          📍 Đã chia sẻ tọa độ GPS
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. TEXT BUBBLE WITH SEARCH HIGHLIGHT */}
                  {msg.text && (
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs relative ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-100 rounded-bl-xs'
                      } ${isMatched ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      {renderHighlightedText(msg.text, searchQuery)}
                    </div>
                  )}

                  {/* REACTIONS DISPLAY */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`flex items-center gap-0.5 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {msg.reactions.map((r, rIdx) => (
                        <button
                          key={rIdx}
                          onClick={() => handleReact(msg.id, r.emoji)}
                          className="bg-white border border-slate-100 rounded-full px-1.5 py-0.2 text-[10px] shadow-xs hover:scale-110 transition-transform cursor-pointer"
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
                      className={`absolute -top-12 ${isMe ? 'right-0' : 'left-0'} bg-white rounded-2xl shadow-2xl border border-slate-100 p-1.5 z-30 flex flex-col gap-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-150`}
                    >
                      {/* EMOJI REACTION QUICK BAR */}
                      <div className="flex items-center justify-between px-1 py-1 border-b border-slate-100">
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
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Trả lời</span>
                        </button>

                        <button
                          onClick={() => handleCopyMessage(msg)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
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
              <div className={`flex items-center gap-1 text-[9px] text-slate-400 mt-0.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {msg.isEdited && (
                  <span className="italic text-slate-400">(đã chỉnh sửa)</span>
                )}
                <span>{msg.timestamp}</span>
                {isMe && (
                  <span>
                    {msg.status === 'read' ? (
                      <CheckCheck className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <Check className="w-3 h-3 text-slate-400" />
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 1. EMOJI DRAWER */}
      {activeDrawer === 'emoji' && (
        <div className="shrink-0 bg-white border-t border-slate-100 p-3 shadow-lg animate-in slide-in-from-bottom-3 z-20 max-h-56 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Biểu tượng cảm xúc (Emoji)</span>
            <button 
              onClick={() => setActiveDrawer(null)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {EMOJI_CATEGORIES.map((cat, catIdx) => (
              <div key={catIdx}>
                <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{cat.title}</div>
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 text-center">
                  {cat.emojis.map((emoji, eIdx) => (
                    <button
                      key={eIdx}
                      type="button"
                      onClick={() => setInputText(prev => prev + emoji)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. GIF (GIPHY) DRAWER */}
      {activeDrawer === 'gif' && (
        <div className="shrink-0 bg-white border-t border-slate-100 p-3.5 shadow-lg animate-in slide-in-from-bottom-3 z-20 max-h-64 flex flex-col">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-black text-white text-[10px] font-black tracking-widest">GIPHY</span>
              <span className="text-xs font-bold text-slate-800">Tìm kiếm ảnh động</span>
            </div>
            <button 
              onClick={() => setActiveDrawer(null)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={gifSearch}
              onChange={(e) => setGifSearch(e.target.value)}
              placeholder="Tìm kiếm GIF theo từ khóa..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 rounded-xl focus:bg-white border border-transparent focus:border-purple-300 focus:outline-none"
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
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-3 gap-2">
            {filteredGifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => handleSendGif(gif.url)}
                className="rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 border border-slate-200 hover:ring-2 hover:ring-purple-600 transition-all cursor-pointer relative group"
              >
                <img 
                  src={gif.url} 
                  alt={gif.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                />
              </button>
            ))}
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
                Đang trả lời {replyingTo.senderId === currentUser.id ? 'chính bạn' : partner.name}
              </span>
              <span className="text-[11px] text-slate-600 truncate block">
                {replyingTo.text || (replyingTo.imageUrl ? '📷 [Hình ảnh]' : replyingTo.videoUrl ? '🎥 [Video]' : '[Tệp đính kèm]')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-indigo-100 cursor-pointer"
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
              <span className="text-[11px] text-slate-600 truncate block">
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
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-amber-100 cursor-pointer"
            title="Hủy chỉnh sửa"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* COMPOSER BOTTOM INPUT BAR: INLINE APPEND LIST ON '+' TAP, SHRINKS INPUT BOX */}
      <form onSubmit={handleSend} className="shrink-0 bg-white border-t border-slate-100 p-2.5 flex items-center gap-1.5 z-10">
        
        {/* LEFT SIDE TOOLS: EMOJI, PLUS (TOGGLES INLINE EXPANSION: PHOTO, VIDEO, LOCATION, GIF) */}
        <div className="flex items-center gap-1 shrink-0 transition-all duration-200">
          
          {/* 1. EMOJI BUTTON */}
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'emoji' ? null : 'emoji')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeDrawer === 'emoji'
                ? 'bg-amber-100 text-amber-700 shadow-xs'
                : 'text-slate-500 hover:text-amber-600 hover:bg-slate-100'
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
                : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
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
                className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                title="Gửi ảnh từ thiết bị"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Video Upload */}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                title="Gửi video từ thiết bị"
              >
                <Video className="w-4 h-4" />
              </button>

              {/* Location Share */}
              <button
                type="button"
                onClick={handleSendLocation}
                className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                title="Gửi vị trí GPS hiện tại"
              >
                <MapPin className="w-4 h-4" />
              </button>

              {/* GIF Search */}
              <button
                type="button"
                onClick={() => setActiveDrawer(activeDrawer === 'gif' ? null : 'gif')}
                className={`px-2 py-1 rounded-xl text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                  activeDrawer === 'gif'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-600'
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
          onChange={(e) => setInputText(e.target.value)}
          placeholder={editingMessage ? "Cập nhật nội dung..." : replyingTo ? "Nhập câu trả lời..." : "Nhập tin nhắn..."}
          className="flex-1 bg-slate-100 hover:bg-slate-200/50 focus:bg-white border border-transparent focus:border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[80px]"
        />

        {/* Send / Update Button */}
        <button
          type="submit"
          disabled={!inputText.trim()}
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
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Ban className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1.5">
              Chặn {partner.name}?
            </h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Bạn sẽ không nhận được tin nhắn từ người này và quan hệ bạn bè sẽ bị chặn trên bản đồ.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmBlock}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Chặn bạn bè
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MESSAGE DIALOG */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4.5 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Xóa tin nhắn?</h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Tin nhắn này sẽ bị xóa khỏi cuộc trò chuyện.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
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
