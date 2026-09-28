export type VisibilityTier = 0 | 1 | 2 | 3 | 4; 
// 0: Chỉ mình tôi (Only me)
// 1: Bạn bè (Friends)
// 2: Bạn thân (Best friends)
// 3: Người yêu (Lover)
// 4: Công khai (Public)

export type FriendshipType = 'friend' | 'best_friend' | 'lover';
export type FriendshipStatus = 'accepted' | 'pending_received' | 'pending_sent' | 'blocked' | 'none';

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  age: number;
  gender: 'Nam' | 'Nữ' | 'Khác';
  battery: number;
  isCharging?: boolean;
  status: string; // e.g. "Đang cafe ☕"
  lastUpdated: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
  };
  visibility: VisibilityTier;
  relationship?: {
    type: FriendshipType;
    status: FriendshipStatus;
  };
  distanceKm?: number;
  /** Raw meters backing the distance chip ("523 m" / "1.2 km"). */
  distanceM?: number;
}

export type ReactionEmoji = '❤️' | '👍' | '😂' | '😮' | '😢' | '😡';

export interface MomentReaction {
  userId: string;
  userName: string;
  userAvatar: string;
  emoji: ReactionEmoji;
}

export interface Moment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  imageUrls?: string[];
  mediaType?: 'image' | 'video';
  videoUrl?: string;
  caption: string;
  locationName?: string;
  includeLocation?: boolean;
  allowDirectMessage?: boolean;
  timeAgo: string;
  createdAt: string;
  visibility: VisibilityTier;
  allowedUserIds?: string[];
  excludedUserIds?: string[];
  allowComment: boolean;
  reactions: MomentReaction[];
  timelineId?: string;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  momentId?: string;
  locationPin?: {
    lat: number;
    lng: number;
    name: string;
  };
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  reactions?: MessageReaction[];
  replyTo?: {
    id: string;
    senderName: string;
    text?: string;
    imageUrl?: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string;
  avatar?: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isPrivateGroup?: boolean;
  isArchived?: boolean;
  adminId?: string;
  pendingRequests?: User[];
  partnerId?: string;
  memberCount?: number;
  isOnline?: boolean;
  isBlocked?: boolean;
  blockedById?: number | null;
}

export interface TimelinePartner {
  id: string;
  name: string;
  avatar: string;
}

export interface Timeline {
  id: string;
  title: string;
  description: string;
  bannerImage: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  partners: TimelinePartner[];
  /** Total stops on the server (the list below may be capped). */
  momentCount?: number;
  moments: {
    id: string;
    title: string;
    caption: string;
    imageUrl: string;
    locationName: string;
    time: string;
    dayNumber: number;
    /** Full mapped moment (viewer needs reactions/visibility) when known. */
    moment?: Moment;
  }[];
}

export type NavTab = 'home' | 'moments' | 'map' | 'chat' | 'setting';

export interface DiscoverableGroup {
  id: string;
  name: string;
  description: string;
  avatar: string;
  category: string;
  isPrivate: boolean;
  memberCount: number;
  activityTime: string;
  requestId?: number;
  requestStatus?: number;
}
