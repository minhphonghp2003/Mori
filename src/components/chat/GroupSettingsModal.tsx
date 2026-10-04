import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Conversation } from '../../types';
import {
  ConversationMemberDto,
  ConversationMemberRole,
  JoinRequestDto,
  JoinRequestStatus,
} from '../../types/chat';
import { useApp } from '../../context/AppContext';
import {
  getPendingJoinRequests,
  confirmJoinRequest,
} from '@/services/chat';
import { mapMember } from '@/lib/chat/mappers';
import { Avatar } from '../common/Avatar';
import { 
  X, 
  Users, 
  UserPlus, 
  UserCheck, 
  LogOut, 
  Edit3, 
  Check, 
  Camera, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  Globe, 
  Lock,
  Upload
} from 'lucide-react';

interface GroupSettingsModalProps {
  conversation: Conversation;
  onClose: () => void;
  onLeaveGroupSuccess: () => void;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  conversation,
  onClose,
  onLeaveGroupSuccess
}) => {
  const { 
    currentUser, 
    friends, 
    setSelectedUser,
    updateGroupInfo, 
    addGroupMembers, 
    leaveGroup,
    loadMembers,
    showToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'members' | 'add' | 'requests'>('members');
  const [groupName, setGroupName] = useState(conversation.name || 'Nhóm trò chuyện');
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(conversation.avatar);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const groupAvatarInputRef = useRef<HTMLInputElement | null>(null);

  // Real members + pending join requests come from the API (design mocks are gone)
  const [memberDtos, setMemberDtos] = useState<ConversationMemberDto[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequestDto[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const refreshMembers = async () => {
    try {
      setMemberDtos(await loadMembers(conversation.id));
    } catch (err) {
      console.error('[GroupSettings] loadMembers failed:', err);
    }
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      const results = await Promise.allSettled([
        loadMembers(conversation.id),
        getPendingJoinRequests(Number(conversation.id)),
      ]);
      if (!alive) return;
      if (results[0].status === 'fulfilled') setMemberDtos(results[0].value);
      if (results[1].status === 'fulfilled') {
        setPendingRequests(
          results[1].value.data.filter((r) => r.status === JoinRequestStatus.Pending),
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [conversation.id, loadMembers]);

  const memberUsers = useMemo(() => memberDtos.map(mapMember), [memberDtos]);
  const adminUserId = useMemo(
    () =>
      memberDtos.find((m) => m.role === ConversationMemberRole.Host)?.userId ??
      memberDtos[0]?.userId,
    [memberDtos],
  );
  // Admin-only features (avatar, name, privacy, add/approve) hide for members.
  const isMeAdmin = Number(currentUser.id) === adminUserId;

  const handleGroupAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn một tệp hình ảnh hợp lệ', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        handleSelectAvatar(dataUrl);
        showToast('Đã đổi ảnh đại diện nhóm!', 'success');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Existing member IDs (from API-backed member list)
  const existingMemberIds = new Set(memberUsers.map(p => p.id));
  
  // Available friends to add
  const availableFriends = friends.filter(f => !existingMemberIds.has(f.id));
  const filteredAvailableFriends = availableFriends.filter(f => 
    f.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const handleSaveName = () => {
    if (!groupName.trim()) {
      showToast('Tên nhóm không được để trống', 'error');
      return;
    }
    void updateGroupInfo(conversation.id, { name: groupName.trim() });
    setIsEditingName(false);
  };

  const handleSelectAvatar = (url: string) => {
    setSelectedAvatar(url);
    void updateGroupInfo(conversation.id, { avatar: url });
  };

  const handleTogglePrivacy = () => {
    const nextPrivacy = !conversation.isPrivateGroup;
    void updateGroupInfo(conversation.id, { isPrivateGroup: nextPrivacy });
  };

  const handleAddSelectedMembers = async () => {
    if (selectedFriendIds.length === 0) return;
    const ok = await addGroupMembers(conversation.id, selectedFriendIds);
    if (ok) await refreshMembers();
    setSelectedFriendIds([]);
    setActiveTab('members');
  };

  const handleReviewRequest = async (req: JoinRequestDto, isApproved: boolean) => {
    if (isLoadingRequests) return;
    setIsLoadingRequests(true);
    try {
      await confirmJoinRequest(req.id, isApproved);
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
      if (isApproved) {
        showToast(`Đã duyệt ${req.userName} vào nhóm.`, 'success');
        await refreshMembers();
      } else {
        showToast(`Đã từ chối yêu cầu của ${req.userName}.`, 'info');
      }
    } catch (err) {
      console.error('[GroupSettings] confirmJoinRequest failed:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleLeaveGroup = () => {
    onLeaveGroupSuccess();
    void leaveGroup(conversation.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cài đặt nhóm</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Group Profile Header: Avatar & Name Edit */}
        <div className="shrink-0 p-5 bg-gradient-to-b from-emerald-50/40 dark:from-emerald-500/10 to-transparent flex flex-col items-center border-b border-slate-100 dark:border-slate-800">
          {/* Hidden file input for Group Avatar */}
          <input
            ref={groupAvatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleGroupAvatarFileChange}
          />

          {/* Avatar with edit button (admin only) */}
          <div
            className={`relative mb-3 group ${isMeAdmin ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (isMeAdmin) groupAvatarInputRef.current?.click();
            }}
            title={isMeAdmin ? 'Chạm để đổi ảnh đại diện nhóm từ thiết bị' : undefined}
          >
            <Avatar
              src={selectedAvatar}
              name={groupName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md transition-transform group-hover:scale-105"
              textClassName="text-2xl"
            />
            {isMeAdmin && (
              <>
                <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] font-bold mt-0.5">Đổi ảnh</span>
                </div>
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 border-2 border-white">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </>
            )}
          </div>

          {isMeAdmin && (
            <button
              type="button"
              onClick={() => groupAvatarInputRef.current?.click()}
              className="mb-2.5 px-3 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-300 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>Tải ảnh từ máy / Thư viện</span>
            </button>
          )}

          {/* Group Name with Inline Edit */}
          {isEditingName ? (
            <div className="flex items-center gap-1.5 w-full max-w-xs">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
                className="flex-1 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-500/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSaveName}
                className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setGroupName(conversation.name || '');
                  setIsEditingName(false);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 text-center">
                {conversation.name}
              </h2>
              {isMeAdmin && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                  title="Đổi tên nhóm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 mb-2">
            <span>{conversation.memberCount || memberUsers.length} thành viên</span>
            <span>•</span>
            <span className={conversation.isPrivateGroup ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
              {conversation.isPrivateGroup ? 'Nhóm Riêng tư' : 'Nhóm Công khai'}
            </span>
          </div>

          {/* Group Privacy Setting Card */}
          <div className="w-full max-w-sm p-2.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                conversation.isPrivateGroup ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {conversation.isPrivateGroup ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{conversation.isPrivateGroup ? 'Nhóm Riêng tư' : 'Nhóm Công khai'}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    conversation.isPrivateGroup ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {conversation.isPrivateGroup ? 'Private' : 'Public'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                  {conversation.isPrivateGroup 
                    ? 'Yêu cầu quản trị viên duyệt khi xin vào' 
                    : 'Bất kỳ ai cũng có thể tìm thấy và tham gia'}
                </div>
              </div>
            </div>

            {isMeAdmin && (
              <button
                onClick={handleTogglePrivacy}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 ${
                  conversation.isPrivateGroup
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {conversation.isPrivateGroup ? 'Mở Công khai' : 'Đặt Riêng tư'}
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation: Members | Add | Requests */}
        <div className="shrink-0 flex items-center border-b border-slate-100 dark:border-slate-800 px-4 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'members'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Thành viên ({conversation.memberCount || memberUsers.length})</span>
          </button>

          {isMeAdmin && (
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'add'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Thêm ({availableFriends.length})</span>
            </button>
          )}

          {isMeAdmin && (
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer relative ${
                activeTab === 'requests'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Duyệt yêu cầu</span>
              {pendingRequests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
          
          {/* TAB 1: MEMBERS LIST */}
          {activeTab === 'members' && (
            <div className="space-y-2">
              {memberUsers.map((member) => {
                const isUserMe = member.id === currentUser.id;
                const isAdmin = Number(member.id) === adminUserId;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-700/70 border border-slate-100 dark:border-slate-700 transition-colors"
                  >
                    <div 
                      onClick={() => {
                        setSelectedUser(member);
                        onClose();
                      }}
                      className="flex items-center gap-3 cursor-pointer group/member flex-1 min-w-0"
                      title="Xem trang cá nhân"
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          src={member.avatar}
                          name={member.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white group-hover/member:ring-emerald-400 transition-all"
                        />
                        {isAdmin && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <ShieldCheck className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 group-hover/member:text-emerald-600 dark:group-hover/member:text-emerald-400 transition-colors">
                          <span className="truncate">{member.name}</span>
                          {isUserMe && (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md shrink-0">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {isAdmin ? 'Quản trị viên nhóm' : 'Thành viên'}
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Admin
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: ADD MEMBERS FROM FRIENDS */}
          {activeTab === 'add' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Tìm bạn bè để thêm vào nhóm..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl border border-transparent focus:border-emerald-300 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                />
              </div>

              {filteredAvailableFriends.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  {memberSearch ? 'Không tìm thấy bạn bè phù hợp' : 'Tất cả bạn bè đã ở trong nhóm này!'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar">
                  {filteredAvailableFriends.map((friend) => {
                    const isSelected = selectedFriendIds.includes(friend.id);
                    return (
                      <div
                        key={friend.id}
                        onClick={() => {
                          setSelectedFriendIds(prev => 
                            isSelected ? prev.filter(id => id !== friend.id) : [...prev, friend.id]
                          );
                        }}
                        className={`flex items-center justify-between p-2 rounded-2xl border transition-all cursor-pointer ${
                          isSelected ? 'bg-emerald-50/80 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={friend.avatar}
                            name={friend.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{friend.name}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[160px]">{friend.bio}</div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                          isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedFriendIds.length > 0 && (
                <button
                  onClick={handleAddSelectedMembers}
                  className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Thêm {selectedFriendIds.length} bạn vào nhóm</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 3: ACCEPT / REJECT MEMBERSHIP REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-2">
              {pendingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                  <span>Không có yêu cầu tham gia nào đang chờ duyệt.</span>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl bg-amber-50/40 border border-amber-200/80 flex items-center justify-between"
                  >
                    <div 
                      onClick={() => {
                        setSelectedUser(mapMember({
                          userId: req.userId,
                          userName: req.userName,
                          userImage: req.userImage,
                          role: ConversationMemberRole.Member,
                          isOnline: false,
                        }));
                        onClose();
                      }}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer group/req flex-1"
                      title="Xem trang cá nhân"
                    >
                      <Avatar
                        src={req.userImage?.thumbUrl || null}
                        name={req.userName}
                        className="w-9 h-9 rounded-full object-cover group-hover/req:ring-2 group-hover/req:ring-emerald-400 transition-all"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover/req:text-emerald-600 dark:group-hover/req:text-emerald-400 transition-colors">{req.userName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Yêu cầu tham gia nhóm</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleReviewRequest(req, false)}
                        disabled={isLoadingRequests}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                      <button
                        onClick={() => handleReviewRequest(req, true)}
                        disabled={isLoadingRequests}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Duyệt
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer: Leave Group Option */}
        <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
          {confirmLeave ? (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center animate-in fade-in">
              <p className="text-xs text-rose-800 font-bold mb-2">
                Bạn có chắc chắn muốn rời khỏi nhóm này không?
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="flex-1 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Ở lại
                </button>
                <button
                  onClick={handleLeaveGroup}
                  className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Xác nhận rời
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Rời khỏi nhóm</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
