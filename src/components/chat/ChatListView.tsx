import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { LogoLoader } from '../common/LogoLoader';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';
import { getDiscoverableGroups } from '@/services/chat';
import { mapDiscoverableGroup } from '@/lib/chat/mappers';
import { DiscoverableGroup, Conversation } from '../../types';
import { CreateGroupModal } from './CreateGroupModal';
import { Avatar } from '../common/Avatar';
import { appHub } from '@/lib/signalr/app-hub';
import { 
  Users, 
  MessageSquare, 
  Pin, 
  Plus, 
  Archive, 
  Sparkles, 
  ArchiveRestore,
  Lock, 
  Globe, 
  Clock, 
  UserPlus, 
  Send, 
  Check,
  MoreVertical,
  Bell,
  BellOff,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export const ChatListView: React.FC = () => {
  const { 
    conversations, 
    currentUser,
    setSelectedUser,
    toggleArchiveConversation,
    toggleMuteConversation,
    deleteConversation,
    joinGroup,
    isLoadingConversations,
    isLoadingMoreConversations,
    conversationsHasMore,
    loadMoreConversations,
    resolvePartnerUser
  } = useApp();
  const router = useRouter();

  const [filterTab, setFilterTab] = useState<'all' | 'archived' | 'discover'>('all');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  
  // Popover menu state for conversations
  const [menuConvId, setMenuConvId] = useState<string | null>(null);
  const [deleteConfirmConv, setDeleteConfirmConv] = useState<Conversation | null>(null);

  // Track IDs of private groups where joining request was sent
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);

  // Discoverable groups (API already excludes groups I'm a member of)
  const [discoverGroups, setDiscoverGroups] = useState<DiscoverableGroup[]>([]);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);

  // Tapping the active Tin nhắn tab scrolls this list up.
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  useScrollToTop(listScrollRef);

  // Global typing previews — room-independent so the list shows
  // "Đang soạn tin..." under the right conversation.
  const [typingByConv, setTypingByConv] = useState<Record<number, { name: string; expires: number }>>({});
  useEffect(() => {
    const unsub = appHub.onReceiveTyping((data) => {
      if (Number(data.userId) === Number(currentUser.id)) return;
      const convId = Number(data.conversationId);
      if (!convId) return;
      setTypingByConv((prev) => {
        const next = { ...prev };
        if (data.isTyping) next[convId] = { name: data.userName, expires: Date.now() + 4000 };
        else delete next[convId];
        return next;
      });
    });
    return unsub;
  }, [currentUser.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTypingByConv((prev) => {
        const now = Date.now();
        const kept = Object.entries(prev).filter(([, v]) => v.expires > now);
        if (kept.length === Object.keys(prev).length) return prev;
        return Object.fromEntries(kept);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const typingTextFor = (convId: string): string | undefined => {
    const t = typingByConv[Number(convId)];
    if (!t) return undefined;
    return t.name ? `${t.name} đang soạn tin...` : 'Đang soạn tin...';
  };

  useEffect(() => {
    if (filterTab !== 'discover') return;
    let alive = true;
    setIsLoadingDiscover(true);
    getDiscoverableGroups()
      .then((res) => {
        if (alive) setDiscoverGroups(res.data.map(mapDiscoverableGroup));
      })
      .catch((err) => console.error('[ChatList] discoverable failed:', err))
      .finally(() => {
        if (alive) setIsLoadingDiscover(false);
      });
    return () => {
      alive = false;
    };
  }, [filterTab]);

  const allActiveConversations = conversations.filter(c => !c.isArchived);
  const archivedConversations = conversations.filter(c => c.isArchived);
  const archivedCount = archivedConversations.length;

  const unjoinedGroups = discoverGroups;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!conversationsHasMore || isLoadingMoreConversations) return;
    if (filterTab === 'discover') return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      void loadMoreConversations();
    }
  };

  const openPartnerProfile = (conv: Conversation) => {
    if (conv.isGroup) return;
    void resolvePartnerUser(conv.id).then((user) => {
      if (user) setSelectedUser(user);
    });
  };

  const handleSendRequest = (group: DiscoverableGroup) => {
    if (pendingRequests.includes(group.id) || group.requestStatus === 0) return;
    setPendingRequests(prev => [...prev, group.id]);
    void joinGroup(group);
  };

  const handleJoinPublicGroup = (group: DiscoverableGroup) => {
    void joinGroup(group);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Header Bar: Button tabs (all, archived, discover) & Add Group in the SAME LINE (No 'Tin nhan' title) */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-3 py-2.5 shadow-xs z-10">
        <div className="flex items-center justify-between gap-2">
          {/* Button Tabs: all, archived, discover */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap truncate shrink-0 ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tất cả
            </button>

            <button
              onClick={() => setFilterTab('archived')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap truncate shrink-0 flex items-center gap-1.5 ${
                filterTab === 'archived'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Archive className="w-3.5 h-3.5 shrink-0" />
              <span>Lưu trữ</span>
              {archivedCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filterTab === 'archived' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {archivedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab('discover')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap truncate shrink-0 flex items-center gap-1.5 ${
                filterTab === 'discover'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Khám phá</span>
              {unjoinedGroups.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filterTab === 'discover' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {unjoinedGroups.length}
                </span>
              )}
            </button>
          </div>

          {/* Add Group Button in the SAME LINE as button tabs */}
          <button
            onClick={() => setShowCreateGroup(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap truncate shrink-0 active:scale-95"
            title="Tạo nhóm mới"
          >
            <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
            <span className="whitespace-nowrap truncate">Tạo nhóm</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={listScrollRef} className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900" onScroll={handleScroll}>
        
        {/* TAB 1: ALL ACTIVE CONVERSATIONS */}
        {filterTab === 'all' && (
          isLoadingConversations && allActiveConversations.length === 0 ? (
            <div className="p-3.5 space-y-3.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : allActiveConversations.length === 0 ? (
            <div className="text-center py-14 px-4">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap truncate">Chưa có tin nhắn nào</div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto mb-4">
                Hãy khám phá các nhóm cộng đồng để bắt đầu trò chuyện.
              </p>
              <button
                onClick={() => setFilterTab('discover')}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer whitespace-nowrap truncate"
              >
                Khám phá nhóm ngay
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/80 dark:divide-slate-800">
              {allActiveConversations.map((conv) => {
                return (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    typingText={typingTextFor(conv.id)}
                    currentUserId={currentUser.id}
                    isMenuOpen={menuConvId === conv.id}
                    onToggleMenu={(e) => {
                      e.stopPropagation();
                      setMenuConvId(prev => prev === conv.id ? null : conv.id);
                    }}
                    onCloseMenu={() => setMenuConvId(null)}
                    onClick={() => {
                      setMenuConvId(null);
                      router.push(`/chat/${conv.id}`);
                    }}
                    onAvatarClick={() => openPartnerProfile(conv)}
                    onArchive={() => {
                      setMenuConvId(null);
                      toggleArchiveConversation(conv.id);
                    }}
                    onMute={() => {
                      setMenuConvId(null);
                      toggleMuteConversation(conv.id);
                    }}
                    onDelete={() => {
                      setMenuConvId(null);
                      setDeleteConfirmConv(conv);
                    }}
                  />
                );
              })}
              {isLoadingMoreConversations && (
                <div className="py-3 flex justify-center">
                  <LogoLoader size="sm" text={null} />
                </div>
              )}
              {!conversationsHasMore && allActiveConversations.length > 4 && (
                <div className="py-3 text-center text-[10px] text-slate-300">
                  Đã hết cuộc trò chuyện
                </div>
              )}
            </div>
          )
        )}

        {/* TAB 2: ARCHIVED CONVERSATIONS */}
        {filterTab === 'archived' && (
          archivedConversations.length === 0 ? (
            <div className="text-center py-14 px-4">
              <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap truncate">Không có tin nhắn lưu trữ</div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                Các cuộc trò chuyện được lưu trữ sẽ xuất hiện tại đây giúp hộp thư chính luôn ngăn nắp.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/80 dark:divide-slate-800">
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-500/10 border-b border-emerald-100/50 dark:border-emerald-500/20 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
                <span className="font-semibold">Đang lưu trữ {archivedConversations.length} cuộc trò chuyện</span>
                <span className="text-[11px] text-emerald-500">Chạm để mở</span>
              </div>
              {archivedConversations.map((conv) => {
                return (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    typingText={typingTextFor(conv.id)}
                    currentUserId={currentUser.id}
                    isMenuOpen={menuConvId === conv.id}
                    onToggleMenu={(e) => {
                      e.stopPropagation();
                      setMenuConvId(prev => prev === conv.id ? null : conv.id);
                    }}
                    onCloseMenu={() => setMenuConvId(null)}
                    onClick={() => {
                      setMenuConvId(null);
                      router.push(`/chat/${conv.id}`);
                    }}
                    onAvatarClick={() => openPartnerProfile(conv)}
                    onArchive={() => {
                      setMenuConvId(null);
                      toggleArchiveConversation(conv.id);
                    }}
                    onMute={() => {
                      setMenuConvId(null);
                      toggleMuteConversation(conv.id);
                    }}
                    onDelete={() => {
                      setMenuConvId(null);
                      setDeleteConfirmConv(conv);
                    }}
                  />
                );
              })}
            </div>
          )
        )}

        {/* TAB 3: DISCOVER - JUST SHOW OTHER GROUPS I'M NOT CURRENTLY JOINING */}
        {filterTab === 'discover' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
                  Nhóm cộng đồng gợi ý
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Chỉ hiển thị các nhóm bạn chưa tham gia
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                {unjoinedGroups.length} nhóm
              </span>
            </div>

            {isLoadingDiscover ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                        <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : unjoinedGroups.length === 0 ? (
              <div className="text-center py-14 px-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap truncate">
                  Đã tham gia tất cả các nhóm!
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                  Bạn đã tham gia toàn bộ các nhóm đề xuất hiện tại. Hãy tạo thêm nhóm mới cùng bạn bè!
                </p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="mt-3.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer whitespace-nowrap truncate"
                >
                  Tự tạo nhóm mới
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {unjoinedGroups.map((grp) => {
                  const hasRequested = pendingRequests.includes(grp.id) || grp.requestStatus === 0;

                  return (
                    <div 
                      key={grp.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-3 hover:border-emerald-200 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          src={grp.avatar}
                          name={grp.name}
                          className="w-12 h-12 rounded-2xl object-cover shrink-0 ring-2 ring-slate-100 dark:ring-white/10"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {grp.name}
                            </h4>
                            {grp.isPrivate ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 px-1.5 py-0.2 rounded-md shrink-0">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Riêng tư</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-1.5 py-0.2 rounded-md shrink-0">
                                <Globe className="w-2.5 h-2.5" />
                                <span>Công khai</span>
                              </span>
                            )}
                          </div>

                          {grp.description && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                              {grp.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                              <Users className="w-3 h-3" aria-hidden="true" />
                              {grp.memberCount} thành viên
                            </span>
                            {grp.activityTime && (
                              <>
                                <span>•</span>
                                <span className="truncate">{grp.activityTime}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons based on privacy type */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {grp.isPrivate 
                            ? 'Cần quản trị viên phê duyệt yêu cầu' 
                            : 'Nhóm tự do tham gia và trò chuyện ngay'}
                        </span>

                        {grp.isPrivate ? (
                          <button
                            onClick={() => handleSendRequest(grp)}
                            disabled={hasRequested}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                              hasRequested
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 active:scale-95'
                            }`}
                          >
                            {hasRequested ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Đã gửi yêu cầu</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Gửi yêu cầu tham gia</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinPublicGroup(grp)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Tham gia ngay</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmConv && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteConfirmConv(null)}
        >
          <div 
            className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl p-5 text-center shadow-2xl border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">Xóa cuộc trò chuyện?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Toàn bộ tin nhắn sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmConv(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  deleteConversation(deleteConfirmConv.id);
                  setDeleteConfirmConv(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onSuccess={(newId) => {
            setShowCreateGroup(false);
            router.push(`/chat/${newId}`);
          }}
        />
      )}
    </div>
  );
};

// Reusable Conversation Item with Popover (Delete, Archive, Mute)
interface ConversationItemProps {
  conv: Conversation;
  typingText?: string;
  currentUserId: string;
  isMenuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  onClick: () => void;
  onAvatarClick?: () => void;
  onArchive: () => void;
  onMute: () => void;
  onDelete: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conv,
  typingText,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  onClick,
  onAvatarClick,
  onArchive,
  onMute,
  onDelete
}) => {
  const displayName = conv.name || (conv.isGroup ? 'Nhóm' : 'Người dùng');
  const displayAvatar = conv.avatar || '';

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors active:bg-slate-100 dark:active:bg-slate-700 group relative"
    >
      {/* Avatar with online dot */}
      <div 
        onClick={(e) => {
          if (onAvatarClick && !conv.isGroup) {
            e.stopPropagation();
            onAvatarClick();
          }
        }}
        className="relative shrink-0 hover:opacity-90 transition-opacity"
        title={!conv.isGroup ? `Xem hồ sơ của ${displayName}` : undefined}
      >
        <Avatar
          src={displayAvatar}
          name={displayName}
          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-white/10"
        />
        {!conv.isGroup && conv.isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5 gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate whitespace-nowrap">
              {displayName}
            </span>
            {conv.isPinned && (
              <Pin className="w-3 h-3 text-emerald-500 fill-emerald-500 shrink-0" />
            )}
            {conv.isMuted && (
              <span title="Đã tắt thông báo">
                <BellOff className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
              </span>
            )}
            {conv.isGroup && (
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-1.5 py-0.2 rounded-md shrink-0">
                Nhóm
              </span>
            )}
          </div>

          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium whitespace-nowrap truncate">
            {conv.lastMessage.timestamp}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className={`text-[11px] truncate whitespace-nowrap leading-relaxed flex-1 ${typingText ? 'text-emerald-600 dark:text-emerald-400 font-semibold italic' : 'text-slate-500 dark:text-slate-400'}`}>
            {typingText
              ? typingText
              : conv.lastMessage.isDeleted
              ? 'Tin nhắn đã bị thu hồi'
              : conv.lastMessage.mediaType === 'gif'
              ? '[GIF]'
              : conv.lastMessage.mediaType === 'video'
              ? '[Video]'
              : conv.lastMessage.mediaType === 'image'
              ? '[Hình ảnh]'
              : conv.lastMessage.renderType === 'Sticker'
              ? '[Sticker]'
              : conv.lastMessage.momentId
              ? '[Khoảnh khắc]'
              : conv.lastMessage.text || 'Chưa có tin nhắn'}
          </p>

          <div className="flex items-center gap-1 shrink-0">
            {/* Unread badge */}
            {conv.unreadCount > 0 && !conv.isMuted && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full whitespace-nowrap truncate mr-1">
                {conv.unreadCount}
              </span>
            )}
            {conv.unreadCount > 0 && conv.isMuted && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-slate-400 text-white text-[10px] font-bold rounded-full whitespace-nowrap truncate mr-1">
                {conv.unreadCount}
              </span>
            )}

            {/* 3-Dots Button Trigger for Popover */}
            <div className="relative">
              <button
                onClick={onToggleMenu}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isMenuOpen 
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' 
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
                title="Tùy chọn cuộc trò chuyện"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Popover Dropdown Menu */}
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseMenu();
                    }}
                  />
                  <div
                    className="absolute right-0 top-full mt-1.5 z-40 w-44 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-1.5 animate-in fade-in zoom-in-95 duration-100 text-slate-700 dark:text-slate-300 select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Archive / Unarchive */}
                    <button
                      onClick={onArchive}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left whitespace-nowrap truncate"
                    >
                      {conv.isArchived ? (
                        <>
                          <ArchiveRestore className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Bỏ lưu trữ</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Lưu trữ</span>
                        </>
                      )}
                    </button>

                    {/* Mute / Unmute */}
                    <button
                      onClick={onMute}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left whitespace-nowrap truncate"
                    >
                      {conv.isMuted ? (
                        <>
                          <Bell className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Bật thông báo</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Tắt thông báo</span>
                        </>
                      )}
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

                    {/* Delete */}
                    <button
                      onClick={onDelete}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer text-left whitespace-nowrap truncate"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Xóa trò chuyện</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
