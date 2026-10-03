import type {
  ConversationDto,
  ConversationMemberDto,
  DiscoverableGroupDto,
  MessageDto,
} from "@/types/chat";
import { isVideoUrl, toChatMessageRenderType } from "@/types/chat";
import type {
  Conversation,
  DiscoverableGroup,
  FriendshipStatus,
  FriendshipType,
  Message,
  User,
} from "@/types";
import type { FriendshipDto, FriendshipTypeValue } from "@/types/friendship";
import {
  FRIENDSHIP_TYPE_VALUES,
  getMyFriendshipType,
  isAccepted,
  isBlocked,
  isPending,
} from "@/types/friendship";
import type { User as ApiUser } from "@/types/user";
import { getPresignedUploadUrls, uploadToPresignedUrl } from "@/services/upload";

const HTTP_URL_RE = /^https?:\/\//;

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

export interface MapMessageOptions {
  editedIds?: Set<number>;
}

export const mapMessage = (dto: MessageDto, opts: MapMessageOptions = {}): Message => {
  const renderType = toChatMessageRenderType(dto.type);
  const attachments = dto.attachments ?? [];
  const first = attachments[0];

  let imageUrl: string | undefined;
  let videoUrl: string | undefined;
  if (first) {
    if (isVideoUrl(first.originalUrl)) videoUrl = first.originalUrl;
    else imageUrl = first.thumbUrl || first.originalUrl;
  }

  const content = dto.content || undefined;
  let text: string | undefined;

  if (renderType === "Gif" || renderType === "Sticker") {
    if (content && HTTP_URL_RE.test(content)) {
      if (isVideoUrl(content)) videoUrl = content;
      else imageUrl = content;
    } else {
      text = content;
    }
  } else {
    text = content;
  }

  if (dto.isDeleted) {
    imageUrl = undefined;
    videoUrl = undefined;
    text = undefined;
  }

  return {
    id: String(dto.id),
    senderId: String(dto.senderId),
    senderName: dto.senderName || undefined,
    senderAvatar: dto.senderAvatar?.thumbUrl || undefined,
    text,
    imageUrl,
    videoUrl,
    momentId: dto.momentId != null ? String(dto.momentId) : undefined,
    timestamp: formatTime(dto.createdAt),
    status: dto.status === 1 ? "read" : "delivered",
    reactions:
      dto.reactions?.map((r) => ({ userId: String(r.userId), emoji: r.emoji })) ??
      undefined,
    replyTo: dto.repliedMessage
      ? {
          id: String(dto.repliedMessage.messageId),
          senderName: dto.repliedMessage.senderName || "Bạn bè",
          text: dto.repliedMessage.content || undefined,
          imageUrl: dto.repliedMessage.attachments?.[0]?.thumbUrl || undefined,
        }
      : undefined,
    isEdited: opts.editedIds?.has(dto.id) ? true : undefined,
    isDeleted: dto.isDeleted ? true : undefined,
  };
};

export interface MapConversationOptions {
  editedIds?: Set<number>;
}

export const mapConversation = (
  dto: ConversationDto,
  opts: MapConversationOptions = {},
): Conversation => {
  const id = dto.id ?? 0;
  const lastMessage: Message = dto.lastMessage
    ? mapMessage(dto.lastMessage, opts)
    : {
        id: `${id}-empty`,
        senderId: "",
        text: "",
        timestamp: "",
        status: "delivered",
      };

  return {
    id: String(id),
    isGroup: !dto.isDirect,
    name: dto.name || undefined,
    avatar: dto.image?.thumbUrl || undefined,
    participants: [],
    lastMessage,
    unreadCount: dto.unreadCount ?? 0,
    isMuted: dto.isMuted || undefined,
    isArchived: dto.isArchived || undefined,
    isPrivateGroup: dto.isRestricted || undefined,
    isOnline: dto.isOnline,
    memberCount: dto.memberCount ?? undefined,
    isBlocked: dto.isBlocked || undefined,
    blockedById: dto.blockedById,
  };
};

export const mapDiscoverableGroup = (dto: DiscoverableGroupDto): DiscoverableGroup => ({
  id: String(dto.id),
  name: dto.name,
  description: "",
  avatar: dto.image?.thumbUrl || "",
  category: "",
  isPrivate: dto.isRestricted,
  memberCount: dto.memberCount,
  activityTime: "",
  requestId: dto.joinRequestId ?? undefined,
  requestStatus: dto.joinRequestStatus ?? undefined,
});

export const emptyUser = (id: string, name: string, avatar: string): User => ({
  id,
  name,
  avatar,
  age: 0,
  gender: "Khác",
  battery: 0,
  status: "",
  lastUpdated: "",
  location: { lat: 0, lng: 0, address: "", city: "" },
  visibility: 4,
});

export const mapMember = (m: ConversationMemberDto): User =>
  emptyUser(String(m.userId), m.userName, m.userImage?.thumbUrl ?? "");

const FRIENDSHIP_TYPE_TO_DESIGN: Record<FriendshipTypeValue, FriendshipType> = {
  [FRIENDSHIP_TYPE_VALUES.Friend]: "friend",
  [FRIENDSHIP_TYPE_VALUES.BestFriend]: "best_friend",
  [FRIENDSHIP_TYPE_VALUES.Lover]: "lover",
};

export const mapFriendshipToUser = (f: FriendshipDto, myId: number): User => {
  const otherId = f.user1Id === myId ? f.user2Id : f.user1Id;
  let status: FriendshipStatus = "none";
  if (isBlocked(f)) status = "blocked";
  else if (isAccepted(f)) status = "accepted";
  else if (isPending(f))
    status = f.requestedById === myId ? "pending_sent" : "pending_received";

  return {
    ...emptyUser(String(otherId), f.otherUserName, f.otherUserImage?.thumbUrl ?? ""),
    relationship: {
      type: FRIENDSHIP_TYPE_TO_DESIGN[getMyFriendshipType(f, myId)],
      status,
    },
  };
};

export const mapMeToUser = (u: ApiUser): User => ({
  ...emptyUser(
    String(u.id),
    u.name,
    u.images?.[0]?.thumbUrl ?? "",
  ),
  age: u.age ?? 0,
  gender: u.genderId === 1 ? "Nam" : u.genderId === 2 ? "Nữ" : "Khác",
  bio: u.bio ?? "",
});

const EXT_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  avi: "video/x-msvideo",
};

export const resolveContentType = (file: File): string => {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_CONTENT_TYPES[ext] ?? "application/octet-stream";
};

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const commaIdx = dataUrl.indexOf(",");
  const header = commaIdx >= 0 ? dataUrl.slice(0, commaIdx) : dataUrl;
  const body = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : "";
  const mimeMatch = /^data:([^;,]+)/.exec(header);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";

  if (!header.includes(";base64")) {
    return new Blob([decodeURIComponent(body)], { type: mime });
  }
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

export interface UploadedChatMedia {
  fileId: string;
  key: string;
}

export const uploadChatMedia = async (
  blob: Blob,
  contentType: string,
): Promise<UploadedChatMedia> => {
  const items = await getPresignedUploadUrls({
    bucket: "Chat",
    contentTypes: [contentType],
  });
  const item = items[0];
  if (!item) throw new Error("Không nhận được URL tải lên.");
  await uploadToPresignedUrl(item.uploadUrl, blob, contentType);
  return { fileId: item.fileId, key: item.key };
};
