import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  Moment, 
  Conversation, 
  Timeline, 
  NavTab, 
  VisibilityTier, 
  ReactionEmoji, 
  FriendshipType,
  Message,
  DiscoverableGroup
} from '../types';
import { 
  CURRENT_USER, 
  MOCK_FRIENDS, 
  MOCK_MOMENTS, 
  MOCK_CONVERSATIONS, 
  MOCK_MESSAGES_DATA, 
  MOCK_TIMELINES 
} from '../data/mockData';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'error';
}

export interface ActiveCall {
  partner: User;
  isVideo: boolean;
  isConnected: boolean;
  duration: number;
  isMuted: boolean;
  isCameraOff: boolean;
}

interface AppContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: User;
  friends: User[];
  moments: Moment[];
  conversations: Conversation[];
  messagesMap: Record<string, Message[]>;
  timelines: Timeline[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  activeTimelineId: string | null;
  setActiveTimelineId: (id: string | null) => void;
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
  activeCall: ActiveCall | null;
  deviceMode: 'phone' | 'full';
  setDeviceMode: (mode: 'phone' | 'full') => void;
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
  addMoment: (momentData: { 
    caption: string; 
    imageUrl: string; 
    imageUrls?: string[];
    mediaType?: 'image' | 'video'; 
    videoUrl?: string; 
    locationName?: string;
    includeLocation?: boolean;
    allowDirectMessage?: boolean;
    visibility: VisibilityTier; 
    allowedUserIds?: string[];
    excludedUserIds?: string[];
    allowComment: boolean;
  }) => void;
  deleteMoment: (momentId: string) => void;
  sendMessage: (conversationId: string, text?: string, imageUrl?: string, locationPin?: { lat: number; lng: number; name: string }, videoUrl?: string, replyTo?: { id: string; senderName: string; text?: string; imageUrl?: string }, momentId?: string) => void;
  editMessage: (conversationId: string, messageId: string, newText: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  reactToMessage: (conversationId: string, messageId: string, emoji: string) => void;
  createGroup: (name: string, memberIds: string[], isPrivate: boolean) => string;
  joinGroup: (group: DiscoverableGroup) => void;
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
  updateProfile: (profileData: Partial<Pick<User, 'name' | 'bio' | 'age' | 'gender' | 'avatar'>>) => void;
  createTimeline: (timelineData: { title: string; description: string; bannerImage: string; startDate: string; endDate: string; partnerIds: string[]; selectedMomentIds: string[] }) => void;
  deleteTimeline: (timelineId: string) => void;
  openChatWithUser: (user: User) => void;
  toggleArchiveConversation: (conversationId: string) => void;
  toggleMuteConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  updateGroupInfo: (conversationId: string, updates: { name?: string; avatar?: string; isPrivateGroup?: boolean }) => void;
  addGroupMembers: (conversationId: string, newMemberIds: string[]) => void;
  acceptGroupRequest: (conversationId: string, user: User) => void;
  rejectGroupRequest: (conversationId: string, userId: string) => void;
  leaveGroup: (conversationId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('map');
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);
  const [friends, setFriends] = useState<User[]>(MOCK_FRIENDS);
  const [moments, setMoments] = useState<Moment[]>(MOCK_MOMENTS);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(MOCK_MESSAGES_DATA);
  const [timelines, setTimelines] = useState<Timeline[]>(MOCK_TIMELINES);
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [deviceMode, setDeviceMode] = useState<'phone' | 'full'>('phone');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isNavHidden, setIsNavHidden] = useState<boolean>(false);

  // Auto restore nav bar when tab changes
  const handleSetActiveTab = (tab: NavTab) => {
    setIsNavHidden(false);
    setActiveTab(tab);
  };

  // Toast helper
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3200);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Call duration counter
  useEffect(() => {
    if (!activeCall || !activeCall.isConnected) return;
    const timer = setInterval(() => {
      setActiveCall(prev => prev ? { ...prev, duration: prev.duration + 1 } : null);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCall?.isConnected]);

  // Profile / Status actions
  const updateStatus = (newStatus: string) => {
    setCurrentUser(prev => ({ ...prev, status: newStatus, lastUpdated: 'Vừa xong' }));
    showToast('Đã cập nhật trạng thái mới ✨', 'success');
  };

  const updateVisibility = (tier: VisibilityTier) => {
    setCurrentUser(prev => ({ ...prev, visibility: tier }));
    const labels = ['Chỉ mình tôi', 'Bạn bè', 'Bạn thân', 'Người yêu', 'Công khai'];
    showToast(`Đã đổi quyền riêng tư vị trí: ${labels[tier]} 📍`, 'success');
  };

  const updateBattery = (battery: number, isCharging = false) => {
    setCurrentUser(prev => ({ ...prev, battery, isCharging }));
    showToast(`Cập nhật mức pin: ${battery}%`, 'info');
  };

  // Moments actions
  const reactToMoment = (momentId: string, emoji: ReactionEmoji) => {
    setMoments(prev => prev.map(m => {
      if (m.id !== momentId) return m;
      const existingReactionIndex = m.reactions.findIndex(r => r.userId === currentUser.id);
      let updatedReactions = [...m.reactions];

      if (existingReactionIndex >= 0) {
        if (updatedReactions[existingReactionIndex].emoji === emoji) {
          // Remove reaction if same
          updatedReactions.splice(existingReactionIndex, 1);
        } else {
          // Update reaction
          updatedReactions[existingReactionIndex] = {
            ...updatedReactions[existingReactionIndex],
            emoji
          };
        }
      } else {
        // Add new reaction
        updatedReactions.push({
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          emoji
        });
      }
      return { ...m, reactions: updatedReactions };
    }));
  };

  const addMoment = (momentData: { 
    caption: string; 
    imageUrl: string; 
    imageUrls?: string[];
    mediaType?: 'image' | 'video'; 
    videoUrl?: string; 
    locationName?: string; 
    includeLocation?: boolean;
    allowDirectMessage?: boolean;
    visibility: VisibilityTier; 
    allowedUserIds?: string[];
    excludedUserIds?: string[];
    allowComment: boolean;
  }) => {
    const newMoment: Moment = {
      id: "moment_" + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      imageUrl: momentData.imageUrl,
      imageUrls: momentData.imageUrls && momentData.imageUrls.length > 0 ? momentData.imageUrls : [momentData.imageUrl],
      mediaType: momentData.mediaType || 'image',
      videoUrl: momentData.videoUrl,
      caption: momentData.caption,
      locationName: momentData.includeLocation !== false ? (momentData.locationName || currentUser.location.address) : undefined,
      includeLocation: momentData.includeLocation !== false,
      allowDirectMessage: momentData.allowDirectMessage !== false,
      timeAgo: 'Vừa xong',
      createdAt: new Date().toISOString(),
      visibility: momentData.visibility,
      allowedUserIds: momentData.allowedUserIds,
      excludedUserIds: momentData.excludedUserIds,
      allowComment: momentData.allowComment,
      reactions: []
    };

    setMoments(prev => [newMoment, ...prev]);
    showToast('Đã đăng khoảnh khắc mới thành công! 📸', 'success');
  };
  const deleteMoment = (momentId: string) => {
    setMoments(prev => prev.filter(m => m.id !== momentId));
    showToast('Đã xóa khoảnh khắc thành công', 'info');
  };

  // Chat actions
  const sendMessage = (
    conversationId: string, 
    text?: string, 
    imageUrl?: string, 
    locationPin?: { lat: number; lng: number; name: string },
    videoUrl?: string,
    replyTo?: { id: string; senderName: string; text?: string; imageUrl?: string },
    momentId?: string
  ) => {
    if (!text && !imageUrl && !locationPin && !videoUrl && !momentId) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      text,
      imageUrl,
      videoUrl,
      locationPin,
      replyTo,
      momentId,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
      reactions: []
    };

    setMessagesMap(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMsg]
    }));

    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      return {
        ...conv,
        lastMessage: newMsg
      };
    }));

    // Simulate smart auto-reply after 1.5s if talking to a friend 1:1
    const currentConv = conversations.find(c => c.id === conversationId);
    if (currentConv && !currentConv.isGroup) {
      const partner = currentConv.participants.find(p => p.id !== currentUser.id);
      if (partner) {
        setTimeout(() => {
          const autoReplies = [
            'Okie bạn ơi! Chiều gặp nhé 😊',
            'Hay quá, tí tôi xem ngay!',
            'Tớ vừa thấy khoảnh khắc của bạn trên bản đồ rồi nè 📍',
            'Cảm ơn bạn nhiều nha! ❤️'
          ];
          const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
          const replyMsg: Message = {
            id: `reply_${Date.now()}`,
            senderId: partner.id,
            text: randomReply,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            status: 'read'
          };
          setMessagesMap(mPrev => ({
            ...mPrev,
            [conversationId]: [...(mPrev[conversationId] || []), replyMsg]
          }));
          setConversations(cPrev => cPrev.map(conv => {
            if (conv.id !== conversationId) return conv;
            return {
              ...conv,
              lastMessage: replyMsg,
              unreadCount: activeConversationId === conversationId ? 0 : conv.unreadCount + 1
            };
          }));
        }, 1500);
      }
    }
  };

  const reactToMessage = (conversationId: string, messageId: string, emoji: string) => {
    setMessagesMap(prev => {
      const list = prev[conversationId] || [];
      const updated = list.map(msg => {
        if (msg.id !== messageId) return msg;
        const currentReactions = msg.reactions || [];
        const existingIdx = currentReactions.findIndex(r => r.userId === currentUser.id);
        let nextReactions = [...currentReactions];
        if (existingIdx >= 0) {
          if (nextReactions[existingIdx].emoji === emoji) {
            nextReactions.splice(existingIdx, 1);
          } else {
            nextReactions[existingIdx] = { userId: currentUser.id, emoji };
          }
        } else {
          nextReactions.push({ userId: currentUser.id, emoji });
        }
        return { ...msg, reactions: nextReactions };
      });
      return { ...prev, [conversationId]: updated };
    });
  };

  const editMessage = (conversationId: string, messageId: string, newText: string) => {
    if (!newText.trim()) return;
    setMessagesMap(prev => {
      const list = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: list.map(m => m.id === messageId ? { ...m, text: newText.trim(), isEdited: true } : m)
      };
    });
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      if (conv.lastMessage.id === messageId) {
        return {
          ...conv,
          lastMessage: { ...conv.lastMessage, text: newText.trim(), isEdited: true }
        };
      }
      return conv;
    }));
    showToast('Đã chỉnh sửa tin nhắn ✏️', 'success');
  };

  const deleteMessage = (conversationId: string, messageId: string) => {
    setMessagesMap(prev => {
      const list = prev[conversationId] || [];
      const updated = list.filter(m => m.id !== messageId);
      return {
        ...prev,
        [conversationId]: updated
      };
    });
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      if (conv.lastMessage.id === messageId) {
        const remaining = (messagesMap[conversationId] || []).filter(m => m.id !== messageId);
        const lastMsg = remaining.length > 0 ? remaining[remaining.length - 1] : conv.lastMessage;
        return {
          ...conv,
          lastMessage: lastMsg
        };
      }
      return conv;
    }));
    showToast('Đã xóa tin nhắn 🗑️', 'info');
  };

  const createGroup = (name: string, memberIds: string[], isPrivate: boolean) => {
    const selectedFriends = friends.filter(f => memberIds.includes(f.id));
    const newConvId = `conv_group_${Date.now()}`;
    const newGroupConv: Conversation = {
      id: newConvId,
      isGroup: true,
      name,
      avatar: selectedFriends[0]?.avatar || CURRENT_USER.avatar,
      participants: [currentUser, ...selectedFriends],
      lastMessage: {
        id: `init_${Date.now()}`,
        senderId: currentUser.id,
        text: `Đã tạo nhóm "${name}"`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      },
      unreadCount: 0,
      isPrivateGroup: isPrivate
    };

    setConversations(prev => [newGroupConv, ...prev]);
    setMessagesMap(prev => ({
      ...prev,
      [newConvId]: [newGroupConv.lastMessage]
    }));

    showToast(`Đã tạo nhóm "${name}" 🎉`, 'success');
    return newConvId;
  };

  const joinGroup = (group: DiscoverableGroup) => {
    const existing = conversations.find(c => c.id === group.id || c.name === group.name);
    if (existing) {
      setActiveConversationId(existing.id);
      setActiveTab('chat');
      return;
    }

    const newGroupConv: Conversation = {
      id: group.id,
      isGroup: true,
      name: group.name,
      avatar: group.avatar,
      participants: [currentUser, ...friends.slice(0, 3)],
      lastMessage: {
        id: `join_${Date.now()}`,
        senderId: 'system',
        text: `🎉 Bạn đã tham gia "${group.name}". Hãy gửi lời chào đến các thành viên!`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      },
      unreadCount: 0,
      isPrivateGroup: group.isPrivate
    };

    setConversations(prev => [newGroupConv, ...prev]);
    setMessagesMap(prev => ({
      ...prev,
      [group.id]: [newGroupConv.lastMessage]
    }));

    showToast(`Đã tham gia nhóm "${group.name}" thành công! 🎉`, 'success');
    setActiveConversationId(group.id);
    setActiveTab('chat');
  };

  // Calling actions
  const startCall = (partner: User, isVideo: boolean) => {
    setActiveCall({
      partner,
      isVideo,
      isConnected: false,
      duration: 0,
      isMuted: false,
      isCameraOff: false
    });

    // Auto connect after 2 seconds
    setTimeout(() => {
      setActiveCall(prev => prev ? { ...prev, isConnected: true } : null);
    }, 2000);
  };

  const endCall = () => {
    setActiveCall(null);
    showToast('Cuộc gọi đã kết thúc', 'info');
  };

  const toggleMuteCall = () => {
    setActiveCall(prev => prev ? { ...prev, isMuted: !prev.isMuted } : null);
  };

  const toggleCameraCall = () => {
    setActiveCall(prev => prev ? { ...prev, isCameraOff: !prev.isCameraOff } : null);
  };

  // Friends & Social Graph actions
  const respondFriendRequest = (userId: string, accept: boolean) => {
    setFriends(prev => prev.map(f => {
      if (f.id !== userId) return f;
      return {
        ...f,
        relationship: {
          type: f.relationship?.type || 'friend',
          status: accept ? 'accepted' : 'blocked'
        }
      };
    }));

    setSelectedUser(prev => (prev && prev.id === userId) ? {
      ...prev,
      relationship: {
        type: prev.relationship?.type || 'friend',
        status: accept ? 'accepted' : 'blocked'
      }
    } : prev);

    const friendName = friends.find(f => f.id === userId)?.name || 'Bạn';
    if (accept) {
      showToast(`Đã kết bạn với ${friendName} 🤝`, 'success');
    } else {
      showToast(`Đã từ chối lời mời từ ${friendName}`, 'info');
    }
  };

  const sendFriendRequest = (userId: string) => {
    setFriends(prev => prev.map(f => {
      if (f.id !== userId) return f;
      return {
        ...f,
        relationship: {
          type: 'friend',
          status: 'pending_sent'
        }
      };
    }));

    setSelectedUser(prev => (prev && prev.id === userId) ? {
      ...prev,
      relationship: {
        type: 'friend',
        status: 'pending_sent'
      }
    } : prev);

    showToast('Đã gửi lời mời kết bạn ✨', 'success');
  };

  const cancelFriendRequest = (userId: string) => {
    setFriends(prev => prev.map(f => {
      if (f.id !== userId) return f;
      return {
        ...f,
        relationship: {
          type: 'friend',
          status: 'none'
        }
      };
    }));

    setSelectedUser(prev => (prev && prev.id === userId) ? {
      ...prev,
      relationship: {
        type: 'friend',
        status: 'none'
      }
    } : prev);

    showToast('Đã thu hồi lời mời kết bạn', 'info');
  };

  const changeFriendshipType = (userId: string, type: FriendshipType) => {
    setFriends(prev => prev.map(f => {
      if (f.id !== userId) return f;
      return {
        ...f,
        relationship: {
          type,
          status: 'accepted'
        }
      };
    }));

    setSelectedUser(prev => (prev && prev.id === userId) ? {
      ...prev,
      relationship: {
        type,
        status: 'accepted'
      }
    } : prev);

    const typeLabels: Record<FriendshipType, string> = {
      friend: 'Bạn bè',
      best_friend: 'Bạn thân ⭐',
      lover: 'Người yêu ❤️'
    };
    showToast(`Đã cập nhật quan hệ: ${typeLabels[type]}`, 'success');
  };

  const removeFriend = (userId: string) => {
    const friendName = friends.find(f => f.id === userId)?.name || 'Bạn bè';
    setFriends(prev => prev.filter(f => f.id !== userId));
    setSelectedUser(prev => (prev && prev.id === userId) ? {
      ...prev,
      relationship: undefined
    } : prev);
    showToast(`Đã hủy kết bạn với ${friendName}`, 'info');
  };

  const blockFriend = (userId: string) => {
    const friendName = friends.find(f => f.id === userId)?.name || 'Người dùng';
    setFriends(prev => prev.map(f => {
      if (f.id !== userId) return f;
      return {
        ...f,
        relationship: {
          type: 'friend',
          status: 'blocked'
        }
      };
    }));
    setSelectedUser(prev => (prev && prev.id === userId) ? {
      ...prev,
      relationship: {
        type: 'friend',
        status: 'blocked'
      }
    } : prev);
    showToast(`Đã chặn ${friendName} 🚫`, 'info');
  };

  const unblockFriend = (userId: string) => {
    const friendName = friends.find(f => f.id === userId)?.name || 'Người dùng';
    setFriends(prev => prev.map(f => {
      if (f.id !== userId) return f;
      return {
        ...f,
        relationship: {
          type: 'friend',
          status: 'accepted'
        }
      };
    }));
    setSelectedUser(prev => (prev && prev.id === userId) ? {
      ...prev,
      relationship: {
        type: 'friend',
        status: 'accepted'
      }
    } : prev);
    showToast(`Đã bỏ chặn ${friendName} 🤝`, 'success');
  };

  const updateProfile = (profileData: Partial<Pick<User, 'name' | 'bio' | 'age' | 'gender' | 'avatar'>>) => {
    setCurrentUser(prev => ({
      ...prev,
      ...profileData
    }));
    showToast('Đã lưu thông tin cá nhân thành công ✨', 'success');
  };

  // Timelines actions
  const createTimeline = (data: {
    title: string;
    description: string;
    bannerImage: string;
    startDate: string;
    endDate: string;
    partnerIds: string[];
    selectedMomentIds: string[];
  }) => {
    const selectedPartners = friends
      .filter(f => data.partnerIds.includes(f.id))
      .map(f => ({ id: f.id, name: f.name, avatar: f.avatar }));

    const selectedMomentObjs = moments
      .filter(m => data.selectedMomentIds.includes(m.id))
      .map((m, idx) => ({
        id: `tl_item_${m.id}`,
        title: m.locationName || 'Khoảnh khắc',
        caption: m.caption,
        imageUrl: m.imageUrl,
        locationName: m.locationName || currentUser.location.address,
        time: m.timeAgo,
        dayNumber: idx + 1
      }));

    const newTl: Timeline = {
      id: `timeline_${Date.now()}`,
      title: data.title,
      description: data.description,
      bannerImage: data.bannerImage || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      startDate: data.startDate,
      endDate: data.endDate,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      ownerAvatar: currentUser.avatar,
      partners: selectedPartners,
      moments: selectedMomentObjs.length > 0 ? selectedMomentObjs : [
        {
          id: `tl_item_1`,
          title: 'Điểm khởi hành 🚀',
          caption: 'Bắt đầu chuyến đi đầy phấn khởi cùng những người bạn tuyệt vời.',
          imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
          locationName: currentUser.location.address,
          time: 'Ngày 1',
          dayNumber: 1
        }
      ]
    };

    setTimelines(prev => [newTl, ...prev]);
    showToast(`Đã tạo hành trình "${data.title}" 🧭`, 'success');
  };

  const deleteTimeline = (timelineId: string) => {
    const target = timelines.find(t => t.id === timelineId);
    setTimelines(prev => prev.filter(t => t.id !== timelineId));
    if (activeTimelineId === timelineId) {
      setActiveTimelineId(null);
    }
    showToast(`Đã xóa hành trình "${target?.title || ''}" 🗑️`, 'info');
  };

  const openChatWithUser = (user: User) => {
    // Check if conversation already exists
    let existingConv = conversations.find(c => 
      !c.isGroup && c.participants.some(p => p.id === user.id)
    );

    if (!existingConv) {
      const newConvId = `conv_${Date.now()}`;
      existingConv = {
        id: newConvId,
        isGroup: false,
        participants: [currentUser, user],
        lastMessage: {
          id: `msg_init_${Date.now()}`,
          senderId: currentUser.id,
          text: `Bắt đầu trò chuyện với ${user.name}`,
          timestamp: 'Vừa xong',
          status: 'sent'
        },
        unreadCount: 0
      };
      setConversations(prev => [existingConv!, ...prev]);
      setMessagesMap(prev => ({
        ...prev,
        [newConvId]: [existingConv!.lastMessage]
      }));
    }

    setActiveConversationId(existingConv.id);
    setActiveTab('chat');
    setSelectedUser(null);
  };

  const toggleArchiveConversation = (conversationId: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      const willArchive = !conv.isArchived;
      showToast(willArchive ? 'Đã lưu trữ cuộc trò chuyện 📁' : 'Đã bỏ lưu trữ cuộc trò chuyện 📥', 'info');
      return { ...conv, isArchived: willArchive };
    }));
  };

  const toggleMuteConversation = (conversationId: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      const willMute = !conv.isMuted;
      showToast(willMute ? 'Đã tắt thông báo cuộc trò chuyện 🔕' : 'Đã bật lại thông báo cuộc trò chuyện 🔔', 'info');
      return { ...conv, isMuted: willMute };
    }));
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
    showToast('Đã xóa cuộc trò chuyện 🗑️', 'info');
  };

  const updateGroupInfo = (conversationId: string, updates: { name?: string; avatar?: string; isPrivateGroup?: boolean }) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      return {
        ...conv,
        name: updates.name?.trim() ? updates.name.trim() : conv.name,
        avatar: updates.avatar || conv.avatar,
        isPrivateGroup: updates.isPrivateGroup !== undefined ? updates.isPrivateGroup : conv.isPrivateGroup
      };
    }));
    showToast('Đã cập nhật cài đặt nhóm 👥', 'success');
  };

  const addGroupMembers = (conversationId: string, newMemberIds: string[]) => {
    const membersToAdd = friends.filter(f => newMemberIds.includes(f.id));
    if (membersToAdd.length === 0) return;

    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      const existingIds = new Set(conv.participants.map(p => p.id));
      const filtered = membersToAdd.filter(m => !existingIds.has(m.id));
      return {
        ...conv,
        participants: [...conv.participants, ...filtered]
      };
    }));

    const names = membersToAdd.map(m => m.name).join(', ');
    const systemMsg: Message = {
      id: `sys_add_${Date.now()}`,
      senderId: 'system',
      text: `${names} đã được thêm vào nhóm.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered'
    };
    setMessagesMap(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), systemMsg]
    }));

    showToast(`Đã thêm ${membersToAdd.length} thành viên vào nhóm`, 'success');
  };

  const acceptGroupRequest = (conversationId: string, user: User) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      const remainingReqs = (conv.pendingRequests || []).filter(r => r.id !== user.id);
      const isAlreadyIn = conv.participants.some(p => p.id === user.id);
      return {
        ...conv,
        participants: isAlreadyIn ? conv.participants : [...conv.participants, user],
        pendingRequests: remainingReqs
      };
    }));

    const systemMsg: Message = {
      id: `sys_join_${Date.now()}`,
      senderId: 'system',
      text: `${user.name} đã tham gia nhóm.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered'
    };
    setMessagesMap(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), systemMsg]
    }));

    showToast(`Đã duyệt yêu cầu tham gia của ${user.name}`, 'success');
  };

  const rejectGroupRequest = (conversationId: string, userId: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      return {
        ...conv,
        pendingRequests: (conv.pendingRequests || []).filter(r => r.id !== userId)
      };
    }));
    showToast('Đã từ chối yêu cầu tham gia nhóm', 'info');
  };

  const leaveGroup = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
    showToast('Đã rời khỏi nhóm', 'info');
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
        conversations,
        messagesMap,
        timelines,
        activeConversationId,
        setActiveConversationId,
        activeTimelineId,
        setActiveTimelineId,
        selectedUser,
        setSelectedUser,
        activeCall,
        deviceMode,
        setDeviceMode,
        toasts,
        showToast,
        removeToast,
        updateStatus,
        updateVisibility,
        updateBattery,
        reactToMoment,
        addMoment,
        deleteMoment,
        sendMessage,
        editMessage,
        deleteMessage,
        reactToMessage,
        createGroup,
        joinGroup,
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
        updateProfile,
        createTimeline,
        deleteTimeline,
        openChatWithUser,
        toggleArchiveConversation,
        toggleMuteConversation,
        deleteConversation,
        updateGroupInfo,
        addGroupMembers,
        acceptGroupRequest,
        rejectGroupRequest,
        leaveGroup
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
