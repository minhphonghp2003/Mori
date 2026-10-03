"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { store } from "@/store";
import { appHub } from "@/lib/signalr/app-hub";
import {
  addConversation,
  addConversations,
  deleteMessage as removeMessageAction,
  mergeMessageReaction,
  prependMessages,
  removeConversation,
  removeMessageReaction,
  setActiveConversation,
  setConversationBlocked,
  setConversationUnblocked,
  setConversations,
  setMessages,
  updateConversationState,
  updateMessage,
} from "@/store/slices/chat-slice";
import * as chatService from "@/services/chat";
import { MessageType, type ConversationMemberDto } from "@/types/chat";
import type { DiscoverableGroup, User } from "@/types";
import {
  dataUrlToBlob,
  mapMember,
  uploadChatMedia,
} from "@/lib/chat/mappers";
import { waitForFileMarkedSuccess } from "@/lib/signalr/file-processing";

export type SendMessageArgs = [
  conversationId: string,
  text?: string,
  image?: string | File,
  locationPin?: { lat: number; lng: number; name: string },
  video?: string | File,
  replyTo?: {
    id: string;
    senderName: string;
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    mediaType?: "text" | "image" | "video" | "gif" | "location" | "moment";
  },
  momentId?: string,
  idempotencyKey?: string,
];

export interface ChatActions {
  sendMessage: (...args: SendMessageArgs) => Promise<boolean>;
  editMessage: (
    conversationId: string,
    messageId: string,
    newText: string,
  ) => Promise<boolean>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<boolean>;
  reactToMessage: (
    conversationId: string,
    messageId: string,
    emoji: string,
  ) => void;
  createGroup: (
    name: string,
    memberIds: string[],
    isPrivate: boolean,
  ) => Promise<string>;
  joinGroup: (group: DiscoverableGroup) => Promise<void>;
  openChatWithUser: (user: User, momentId?: string) => Promise<void>;
  toggleArchiveConversation: (conversationId: string) => void;
  toggleMuteConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  updateGroupInfo: (
    conversationId: string,
    updates: { name?: string; avatar?: string; isPrivateGroup?: boolean },
  ) => Promise<void>;
  addGroupMembers: (
    conversationId: string,
    newMemberIds: string[],
  ) => Promise<boolean>;
  leaveGroup: (conversationId: string) => Promise<void>;
  blockChat: (conversationId: string, targetUserId: string) => Promise<boolean>;
  unblockChat: (conversationId: string, targetUserId: string) => Promise<boolean>;
  refreshConversations: () => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  enterConversation: (conversationId: string) => Promise<void>;
  leaveConversation: () => Promise<void>;
  resolvePartnerUser: (conversationId: string) => Promise<User | null>;
  loadMembers: (conversationId: string) => Promise<ConversationMemberDto[]>;
  /**
   * Server search (`/messages/search` returns an ascending context window
   * around the hit). Replaces the thread window (paging continues from the
   * window head) and resolves the numeric target id to jump to — null when
   * nothing matches. Toasts stay with the caller (it owns showToast).
   */
  openSearchWindow: (
    conversationId: string,
    params: { messageId?: number; content?: string },
  ) => Promise<{ targetId: number } | null>;
  isLoadingMore: boolean;
}

interface UseChatActionsOptions {
  toast: (text: string, type?: "success" | "info" | "error") => void;
  setSelectedUser: (user: User | null) => void;
  revealNav: () => void;
}

export function useChatActions({
  toast,
  setSelectedUser,
  revealNav,
}: UseChatActionsOptions): ChatActions {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const myId = useAppSelector((s) => s.auth.user?.id);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const joinedConvRef = useRef<number | null>(null);
  const partnerCacheRef = useRef(new Map<string, User>());

  const refreshConversations = useCallback(async () => {
    try {
      const res = await chatService.getConversations(undefined, 20);
      dispatch(setConversations({ data: res.data, hasMore: res.hasMore }));
    } catch (err) {
      console.error("[chat] refreshConversations failed:", err);
    }
  }, [dispatch]);

  const loadMoreConversations = useCallback(async () => {
    const state = store.getState().chat;
    if (!state.conversationsHasMore || isLoadingMore) return;
    const lastId = state.conversations[state.conversations.length - 1]?.id;
    if (lastId == null) return;
    setIsLoadingMore(true);
    try {
      const res = await chatService.getConversations(lastId, 20);
      dispatch(addConversations({ data: res.data, hasMore: res.hasMore }));
    } catch (err) {
      console.error("[chat] loadMoreConversations failed:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [dispatch, isLoadingMore]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const convId = Number(conversationId);
      if (!convId) return;
      try {
        const res = await chatService.getMessages(convId, null, 20);
        dispatch(
          setMessages({
            conversationId: convId,
            messages: res.data.slice().reverse(),
            hasMore: res.hasMore,
            prevId: res.prevId ?? null,
          }),
        );
      } catch (err) {
        console.error("[chat] loadMessages failed:", err);
      }
    },
    [dispatch],
  );

  const loadOlderMessages = useCallback(
    async (conversationId: string) => {
      const convId = Number(conversationId);
      if (!convId) return;
      const state = store.getState().chat;
      if (!state.messageHasMore[convId]) return;
      const prevId = state.messagePrevIds[convId];
      if (prevId == null) return;
      try {
        const res = await chatService.getMessages(convId, prevId, 20);
        dispatch(
          prependMessages({
            conversationId: convId,
            messages: res.data.slice().reverse(),
            hasMore: res.hasMore,
            prevId: res.prevId ?? null,
          }),
        );
      } catch (err) {
        console.error("[chat] loadOlderMessages failed:", err);
      }
    },
    [dispatch],
  );

  const enterConversation = useCallback(
    async (conversationId: string) => {
      const convId = Number(conversationId);
      if (!convId) return;

      const prevJoined = joinedConvRef.current;
      if (prevJoined != null && prevJoined !== convId) {
        joinedConvRef.current = null;
        try {
          await appHub.leaveConversation(prevJoined);
        } catch {}
      }

      dispatch(setActiveConversation(convId));
      // Unread accounting is server-driven now: JoinConversation resets the
      // room and re-pushes the authoritative total via ReceiveUnreadCount,
      // so nothing is cleared locally — the badge follows the payload.
      partnerCacheRef.current.delete(conversationId);

      await loadMessages(conversationId);

      try {
        const detail = await chatService.getConversation(convId);
        if (detail.data) {
          // Upsert, not patch-only: a freshly created conversation has no
          // row yet, and the room renders "not found" until one appears.
          dispatch(addConversation(detail.data));
        }
      } catch (err) {
        console.error("[chat] enterConversation detail failed:", err);
      }

      try {
        // The room page effect can run before the ChatSync provider starts the
        // hub — start() is idempotent/serialized, so make sure the socket is
        // up before joining, otherwise the ReceiveMessage echo never lands.
        await appHub.start();
        // JoinConversation resolves, then the server re-pushes the fresh
        // global total via ReceiveUnreadCount — the badge updates itself.
        await appHub.joinConversation(convId);
        joinedConvRef.current = convId;
      } catch (err) {
        console.error("[chat] joinConversation failed:", err);
      }
    },
    [dispatch, loadMessages],
  );

  const leaveConversation = useCallback(async () => {
    const joined = joinedConvRef.current;
    joinedConvRef.current = null;
    dispatch(setActiveConversation(null));
    if (joined != null) {
      try {
        await appHub.leaveConversation(joined);
      } catch (err) {
        console.error("[chat] leaveConversation failed:", err);
      }
    }
  }, [dispatch]);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      text?: string,
      image?: string | File,
      locationPin?: { lat: number; lng: number; name: string },
      video?: string | File,
      replyTo?: {
        id: string;
        senderName: string;
        text?: string;
        imageUrl?: string;
        videoUrl?: string;
        mediaType?: "text" | "image" | "video" | "gif" | "location" | "moment";
      },
      momentId?: string,
      idempotencyKey?: string,
    ): Promise<boolean> => {
      const convId = Number(conversationId);
      if (!convId) return false;

      try {
        let content: string | null = text?.trim() || null;
        let messageType: number = MessageType.Text;
        let fileIds: string[] | undefined;

        if (locationPin && !content) {
          content = `${locationPin.name} — https://www.google.com/maps?q=${locationPin.lat},${locationPin.lng}`;
        }

        const media = image ?? video;
        // Post media first, then wait for the server to generate the thumb
        // (ReceiveFileMarkedSuccess) before sending — the bubble must never
        // render alt text. A timeout falls through and sends anyway; the
        // thumb patches in later via the same event.
        const awaitThumb = async (upload: { fileId: string; key: string }) => {
          try {
            await waitForFileMarkedSuccess(upload);
          } catch {
            // Timeout — send anyway, chat-sync patches the thumb on arrival.
          }
        };
        if (media instanceof File) {
          const blob: Blob = media;
          const contentType = media.type || "application/octet-stream";
          const upload = await uploadChatMedia(blob, contentType);
          fileIds = [upload.fileId];
          messageType = MessageType.File;
          await awaitThumb(upload);
        } else if (typeof media === "string" && media.length > 0) {
          if (media.startsWith("data:")) {
            const blob = dataUrlToBlob(media);
            const upload = await uploadChatMedia(blob, blob.type || "image/jpeg");
            fileIds = [upload.fileId];
            messageType = MessageType.File;
            await awaitThumb(upload);
          } else {
            // External URL (GIF from GIPHY) is referenced directly.
            content = media;
            messageType = MessageType.Gif;
          }
        }

        await appHub.sendMessage({
          conversationId: convId,
          content,
          messageType,
          replyToId: replyTo ? Number(replyTo.id) || null : null,
          idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
          momentId: momentId ? Number(momentId) : undefined,
          fileIds,
        });
        return true;
      } catch (err) {
        console.error("[chat] sendMessage failed:", err);
        toast("Không gửi được tin nhắn. Nhấn thử lại để gửi lại.", "error");
        return false;
      }
    },
    [toast],
  );

  const editMessage = useCallback(
    async (
      conversationId: string,
      messageId: string,
      newText: string,
    ): Promise<boolean> => {
      const convId = Number(conversationId);
      const msgId = Number(messageId);
      if (!convId || !msgId || !newText.trim()) return false;
      try {
        await appHub.editMessage({
          conversationId: convId,
          messageId: msgId,
          content: newText.trim(),
        });
        const existing = store
          .getState()
          .chat.messages[convId]?.find((m) => m.id === msgId);
        if (existing) {
          dispatch(
            updateMessage({
              conversationId: convId,
              message: { ...existing, content: newText.trim() },
            }),
          );
        }
        toast("Đã chỉnh sửa tin nhắn", "success");
        return true;
      } catch (err) {
        console.error("[chat] editMessage failed:", err);
        toast("Không thể chỉnh sửa tin nhắn.", "error");
        return false;
      }
    },
    [dispatch, toast],
  );

  const deleteMessage = useCallback(
    async (conversationId: string, messageId: string): Promise<boolean> => {
      const convId = Number(conversationId);
      const msgId = Number(messageId);
      if (!convId || !msgId) return false;
      try {
        await appHub.deleteMessage({ conversationId: convId, messageId: msgId });
        dispatch(removeMessageAction({ conversationId: convId, messageId: msgId }));
        toast("Đã xóa tin nhắn", "info");
        return true;
      } catch (err) {
        console.error("[chat] deleteMessage failed:", err);
        toast("Không thể xóa tin nhắn.", "error");
        return false;
      }
    },
    [dispatch, toast],
  );

  const reactToMessage = useCallback(
    (conversationId: string, messageId: string, emoji: string) => {
      const convId = Number(conversationId);
      const msgId = Number(messageId);
      const userId = myId;
      if (!convId || !msgId || !userId) return;
      const msg = store
        .getState()
        .chat.messages[convId]
        ?.find((m) => m.id === msgId);
      const mine = msg?.reactions?.some(
        (r) => r.userId === userId && r.emoji === emoji,
      );
      (async () => {
        try {
          if (mine) {
            await appHub.removeReactMessage({
              conversationId: convId,
              messageId: msgId,
              emoji,
            });
            dispatch(
              removeMessageReaction({
                conversationId: convId,
                messageId: msgId,
                userId,
                emoji,
              }),
            );
          } else {
            await appHub.reactMessage({
              conversationId: convId,
              messageId: msgId,
              emoji,
            });
            dispatch(
              mergeMessageReaction({
                conversationId: convId,
                messageId: msgId,
                userId,
                emoji,
              }),
            );
          }
        } catch (err) {
          console.error("[chat] reactToMessage failed:", err);
          toast("Không thể thả cảm xúc.", "error");
        }
      })();
    },
    [dispatch, myId, toast],
  );

  const createGroup = useCallback(
    async (
      name: string,
      memberIds: string[],
      isPrivate: boolean,
    ): Promise<string> => {
      try {
        const res = await chatService.createGroupChat(
          name.trim() || undefined,
          memberIds.map(Number).filter((n) => n > 0),
          isPrivate,
        );
        const convId = res.data;
        if (!convId) return "";
        try {
          const detail = await chatService.getConversation(convId);
          if (detail.data) dispatch(addConversation(detail.data));
        } catch (err) {
          console.error("[chat] createGroup detail failed:", err);
        }
        toast(`Đã tạo nhóm "${name}"`, "success");
        return String(convId);
      } catch (err) {
        console.error("[chat] createGroup failed:", err);
        return "";
      }
    },
    [dispatch, toast],
  );

  const joinGroup = useCallback(
    async (group: DiscoverableGroup) => {
      const groupId = Number(group.id);
      if (!groupId) return;
      if (group.isPrivate) {
        try {
          await chatService.createJoinRequest(groupId);
          toast(`Đã gửi yêu cầu tham gia "${group.name}"`, "info");
        } catch (err) {
          console.error("[chat] createJoinRequest failed:", err);
        }
        return;
      }
      try {
        await chatService.joinGroupDirect(groupId);
        try {
          const detail = await chatService.getConversation(groupId);
          if (detail.data) dispatch(addConversation(detail.data));
        } catch (err) {
          console.error("[chat] joinGroup detail failed:", err);
        }
        toast(`Đã tham gia nhóm "${group.name}"`, "success");
        revealNav();
        router.push(`/chat/${groupId}`);
      } catch (err) {
        console.error("[chat] joinGroup failed:", err);
      }
    },
    [dispatch, revealNav, router, toast],
  );

  /** Opens (or creates) the 1:1 conversation; `momentId` attaches the moment
   *  as a pending share via the `/chat/{id}?momentId=` query param. */
  const openChatWithUser = useCallback(
    async (user: User, momentId?: string) => {
      const uid = Number(user.id);
      if (!uid) return;
      try {
        const existing = await chatService.getOpponentConversation(uid);
        let convId = existing.data;
        if (!convId) {
          const created = await chatService.createConversation(
            uid,
            null,
            MessageType.Text,
          );
          convId = created.data;
        }
        if (!convId) return;
        revealNav();
        setSelectedUser(null);
        router.push(`/chat/${convId}${momentId ? `?momentId=${momentId}` : ''}`);
      } catch (err) {
        console.error("[chat] openChatWithUser failed:", err);
      }
    },
    [revealNav, router, setSelectedUser],
  );

  const toggleArchiveConversation = useCallback(
    (conversationId: string) => {
      const convId = Number(conversationId);
      const conv = store
        .getState()
        .chat.conversations.find((c) => c.id === convId);
      if (!conv) return;
      const next = !conv.isArchived;
      dispatch(
        updateConversationState({
          conversationId: convId,
          patch: { isArchived: next },
        }),
      );
      toast(
        next
          ? "Đã lưu trữ cuộc trò chuyện"
          : "Đã bỏ lưu trữ cuộc trò chuyện",
        "info",
      );
      chatService
        .setConversationArchived(convId, next)
        .catch(() =>
          dispatch(
            updateConversationState({
              conversationId: convId,
              patch: { isArchived: !next },
            }),
          ),
        );
    },
    [dispatch, toast],
  );

  const toggleMuteConversation = useCallback(
    (conversationId: string) => {
      const convId = Number(conversationId);
      const conv = store
        .getState()
        .chat.conversations.find((c) => c.id === convId);
      if (!conv) return;
      const next = !conv.isMuted;
      dispatch(
        updateConversationState({ conversationId: convId, patch: { isMuted: next } }),
      );
      toast(
        next
          ? "Đã tắt thông báo cuộc trò chuyện"
          : "Đã bật lại thông báo cuộc trò chuyện",
        "info",
      );
      chatService
        .setConversationMuted(convId, next)
        .catch(() =>
          dispatch(
            updateConversationState({
              conversationId: convId,
              patch: { isMuted: !next },
            }),
          ),
        );
    },
    [dispatch, toast],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      const convId = Number(conversationId);
      if (!convId) return;
      const wasActive = store.getState().chat.activeConversationId === convId;
      dispatch(removeConversation(convId));
      if (wasActive) {
        void leaveConversation();
        router.push("/chat");
      }
      toast("Đã xóa cuộc trò chuyện", "info");
      chatService.deleteChat(convId).catch((err) => {
        console.error("[chat] deleteChat failed:", err);
      });
    },
    [dispatch, leaveConversation, router, toast],
  );

  const updateGroupInfo = useCallback(
    async (
      conversationId: string,
      updates: { name?: string; avatar?: string; isPrivateGroup?: boolean },
    ) => {
      const convId = Number(conversationId);
      if (!convId) return;
      try {
        const trimmedName = updates.name?.trim();
        if (trimmedName) {
          await chatService.renameGroupChat(convId, trimmedName);
          dispatch(
            updateConversationState({
              conversationId: convId,
              patch: { name: trimmedName },
            }),
          );
        }
        if (updates.avatar && updates.avatar.startsWith("data:")) {
          const blob = dataUrlToBlob(updates.avatar);
          const upload = await uploadChatMedia(blob, blob.type || "image/jpeg");
          await chatService.changeGroupImage(convId, upload.fileId);
          // The detail may still carry the old image (file processing lags)
          // — put the device-selected avatar in the header directly and
          // keep it over the stale return.
          const deviceImage = { originalUrl: updates.avatar, thumbUrl: updates.avatar };
          const detail = await chatService.getConversation(convId);
          dispatch(
            updateConversationState({
              conversationId: convId,
              patch: { ...(detail.data ?? {}), image: deviceImage },
            }),
          );
        }
        if (updates.isPrivateGroup !== undefined) {
          await chatService.setGroupRestricted(convId, updates.isPrivateGroup);
          dispatch(
            updateConversationState({
              conversationId: convId,
              patch: { isRestricted: updates.isPrivateGroup },
            }),
          );
        }
        toast("Đã cập nhật cài đặt nhóm 👥", "success");
      } catch (err) {
        console.error("[chat] updateGroupInfo failed:", err);
      }
    },
    [dispatch, toast],
  );

  const addGroupMembers = useCallback(
    async (conversationId: string, newMemberIds: string[]): Promise<boolean> => {
      const convId = Number(conversationId);
      if (!convId || newMemberIds.length === 0) return false;
      const conv = store
        .getState()
        .chat.conversations.find((c) => c.id === convId);
      let added = 0;
      for (const idStr of newMemberIds) {
        const uid = Number(idStr);
        if (!uid) continue;
        try {
          await chatService.addGroupMember(convId, uid);
          added += 1;
        } catch (err) {
          console.error("[chat] addGroupMember failed:", err);
        }
      }
      if (added > 0) {
        dispatch(
          updateConversationState({
            conversationId: convId,
            patch: { memberCount: (conv?.memberCount ?? 1) + added },
          }),
        );
        toast(`Đã thêm ${added} thành viên vào nhóm`, "success");
        return true;
      }
      return false;
    },
    [dispatch, toast],
  );

  const leaveGroup = useCallback(
    async (conversationId: string) => {
      const convId = Number(conversationId);
      if (!convId) return;
      try {
        await chatService.leaveGroup(convId);
        const wasActive = store.getState().chat.activeConversationId === convId;
        dispatch(removeConversation(convId));
        if (wasActive) {
          await leaveConversation();
          router.push("/chat");
        }
        toast("Đã rời khỏi nhóm", "info");
      } catch (err) {
        console.error("[chat] leaveGroup failed:", err);
      }
    },
    [dispatch, leaveConversation, router, toast],
  );

  const blockChat = useCallback(
    async (conversationId: string, targetUserId: string): Promise<boolean> => {
      const convId = Number(conversationId);
      const targetId = Number(targetUserId);
      if (!convId || !targetId || !myId) return false;
      try {
        await chatService.blockChatUser(targetId);
        dispatch(
          setConversationBlocked({ conversationId: convId, blockedById: myId }),
        );
        return true;
      } catch (err) {
        console.error("[chat] blockChat failed:", err);
        return false;
      }
    },
    [dispatch, myId],
  );

  const unblockChat = useCallback(
    async (conversationId: string, targetUserId: string): Promise<boolean> => {
      const convId = Number(conversationId);
      const targetId = Number(targetUserId);
      if (!convId || !targetId) return false;
      try {
        await chatService.unblockChatUser(targetId);
        dispatch(setConversationUnblocked(convId));
        return true;
      } catch (err) {
        console.error("[chat] unblockChat failed:", err);
        return false;
      }
    },
    [dispatch],
  );

  const resolvePartnerUser = useCallback(
    async (conversationId: string): Promise<User | null> => {
      const cached = partnerCacheRef.current.get(conversationId);
      if (cached) return cached;
      const convId = Number(conversationId);
      if (!convId) return null;
      try {
        const res = await chatService.getConversationMembers(convId);
        const other = res.data.find((m) => m.userId !== myId);
        if (!other) return null;
        const user = mapMember(other);
        partnerCacheRef.current.set(conversationId, user);
        return user;
      } catch (err) {
        console.error("[chat] resolvePartnerUser failed:", err);
        return null;
      }
    },
    [myId],
  );

  const loadMembers = useCallback(
    async (conversationId: string): Promise<ConversationMemberDto[]> => {
      const convId = Number(conversationId);
      if (!convId) return [];
      try {
        const res = await chatService.getConversationMembers(convId);
        return res.data;
      } catch (err) {
        console.error("[chat] loadMembers failed:", err);
        return [];
      }
    },
    [],
  );

  /** Server search window (see interface) — replaces the thread list. */
  const openSearchWindow = useCallback(
    async (
      conversationId: string,
      params: { messageId?: number; content?: string },
    ): Promise<{ targetId: number } | null> => {
      const convId = Number(conversationId);
      if (!convId) return null;
      try {
        const res = await chatService.searchMessages(convId, params);
        if (!res.data.length) return null;
        dispatch(
          setMessages({
            conversationId: convId,
            // Server order is already oldest-first — no reverse.
            messages: res.data,
            hasMore: true,
            prevId: res.data[0].id - 1,
          }),
        );
        const middle = res.data[Math.floor(res.data.length / 2)];
        const targetId =
          params.messageId ?? middle?.id ?? res.data[res.data.length - 1].id;
        return { targetId };
      } catch (err) {
        console.error("[chat] openSearchWindow failed:", err);
        return null;
      }
    },
    [dispatch],
  );

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    createGroup,
    joinGroup,
    openChatWithUser,
    toggleArchiveConversation,
    toggleMuteConversation,
    deleteConversation,
    updateGroupInfo,
    addGroupMembers,
    leaveGroup,
    blockChat,
    unblockChat,
    refreshConversations,
    loadMoreConversations,
    loadMessages,
    loadOlderMessages,
    enterConversation,
    leaveConversation,
    resolvePartnerUser,
    loadMembers,
    openSearchWindow,
    isLoadingMore,
  };
}
