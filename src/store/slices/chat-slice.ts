import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ConversationDto, MessageDto, ConversationUpdatedNotificationDto } from "@/types/chat";

interface ChatState {
  conversations: ConversationDto[];
  conversationsHasMore: boolean;
  activeConversationId: number | null;
  messages: Record<number, MessageDto[]>;
  messageHasMore: Record<number, boolean>;
  messagePrevIds: Record<number, number | null>;
  editedMessageIds: number[];
  totalUnreadCount: number;
}

const initialState: ChatState = {
  conversations: [],
  conversationsHasMore: true,
  activeConversationId: null,
  messages: {},
  messageHasMore: {},
  messagePrevIds: {},
  editedMessageIds: [],
  totalUnreadCount: 0,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations: (
      state,
      action: PayloadAction<{ data: ConversationDto[]; hasMore: boolean }>,
    ) => {
      state.conversations = action.payload.data;
      state.conversationsHasMore = action.payload.hasMore;
    },
    addConversations: (
      state,
      action: PayloadAction<{ data: ConversationDto[]; hasMore: boolean }>,
    ) => {
      const existingIds = new Set(state.conversations.map((c) => c.id));
      const newOnes = action.payload.data.filter((c) => !existingIds.has(c.id));
      state.conversations.push(...newOnes);
      state.conversationsHasMore = action.payload.hasMore;
    },
    addConversation: (state, action: PayloadAction<ConversationDto>) => {
      const idx = state.conversations.findIndex((c) => c.id === action.payload.id);
      if (idx !== -1) {
        state.conversations[idx] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
    },
    updateConversationWithLastMessage: (
      state,
      action: PayloadAction<{
        conversationId: number;
        message: MessageDto;
        myUserId?: number;
      }>,
    ) => {
      const { conversationId, message, myUserId } = action.payload;
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (conv) {
        conv.lastMessage = message;
        const idx = state.conversations.indexOf(conv);
        if (idx > 0) {
          state.conversations.splice(idx, 1);
          state.conversations.unshift(conv);
        }
        const isMine = myUserId != null && message.senderId === myUserId;
        if (state.activeConversationId !== conversationId && !isMine) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1;
        }
      }
    },
    updateConversationFromNotification: (
      state,
      action: PayloadAction<ConversationUpdatedNotificationDto>,
    ) => {
      const { conversationId, lastMessage, unreadCount } = action.payload;
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      conv.lastMessage = lastMessage;
      conv.unreadCount = unreadCount;
      const idx = state.conversations.indexOf(conv);
      if (idx > 0) {
        state.conversations.splice(idx, 1);
        state.conversations.unshift(conv);
      }
    },
    setActiveConversation: (state, action: PayloadAction<number | null>) => {
      state.activeConversationId = action.payload;
    },
    resetUnreadCount: (state, action: PayloadAction<number>) => {
      const conv = state.conversations.find((c) => c.id === action.payload);
      if (conv) {
        conv.unreadCount = 0;
      }
    },
    setConversationBlocked: (
      state,
      action: PayloadAction<{ conversationId: number; blockedById: number }>,
    ) => {
      const conv = state.conversations.find((c) => c.id === action.payload.conversationId);
      if (conv) {
        conv.isBlocked = true;
        conv.blockedById = action.payload.blockedById;
      }
    },
    setConversationUnblocked: (state, action: PayloadAction<number>) => {
      const conv = state.conversations.find((c) => c.id === action.payload);
      if (conv) {
        conv.isBlocked = false;
        conv.blockedById = null;
      }
    },
    setMessages: (
      state,
      action: PayloadAction<{
        conversationId: number;
        messages: MessageDto[];
        hasMore: boolean;
        prevId?: number | null;
      }>,
    ) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
      state.messageHasMore[action.payload.conversationId] = action.payload.hasMore;
      state.messagePrevIds[action.payload.conversationId] =
        action.payload.prevId ?? null;
    },
    prependMessages: (
      state,
      action: PayloadAction<{
        conversationId: number;
        messages: MessageDto[];
        hasMore: boolean;
        prevId?: number | null;
      }>,
    ) => {
      const existing = state.messages[action.payload.conversationId] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const newOnes = action.payload.messages.filter((m) => !existingIds.has(m.id));
      state.messages[action.payload.conversationId] = [...newOnes, ...existing];
      state.messageHasMore[action.payload.conversationId] = action.payload.hasMore;
      state.messagePrevIds[action.payload.conversationId] =
        action.payload.prevId ?? null;
    },
    mergeMessages: (
      state,
      action: PayloadAction<{ conversationId: number; messages: MessageDto[] }>,
    ) => {
      const { conversationId, messages } = action.payload;
      const list = state.messages[conversationId] ?? [];
      const map = new Map(list.map((m) => [m.id, m]));
      for (const m of messages) {
        if (!map.has(m.id)) map.set(m.id, m);
      }
      state.messages[conversationId] = [...map.values()].sort((a, b) => a.id - b.id);
    },
    appendMessage: (
      state,
      action: PayloadAction<{ conversationId: number; message: MessageDto }>,
    ) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      if (!state.messages[conversationId].some((m) => m.id === message.id)) {
        state.messages[conversationId].push(message);
      }
    },
    updateMessage: (
      state,
      action: PayloadAction<{ conversationId: number; message: MessageDto }>,
    ) => {
      const { conversationId, message } = action.payload;
      const list = state.messages[conversationId];
      if (list) {
        const idx = list.findIndex((m) => m.id === message.id);
        if (idx !== -1) {
          list[idx] = {
            ...message,
            repliedMessage: message.repliedMessage ?? list[idx].repliedMessage,
          };
          if (!state.editedMessageIds.includes(message.id)) {
            state.editedMessageIds.push(message.id);
          }
        }
      }
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (conv && conv.lastMessage && conv.lastMessage.id === message.id) {
        conv.lastMessage = message;
      }
    },
    deleteMessage: (
      state,
      action: PayloadAction<{ conversationId: number; messageId: number }>,
    ) => {
      const { conversationId, messageId } = action.payload;
      const list = state.messages[conversationId];
      if (list) {
        const idx = list.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            isDeleted: true,
            content: null,
            attachments: [],
            reactions: [],
          };
        }
      }
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (conv && conv.lastMessage && conv.lastMessage.id === messageId) {
        conv.lastMessage = {
          ...conv.lastMessage,
          isDeleted: true,
          content: null,
          attachments: [],
          reactions: [],
        };
      }
    },
    mergeMessageReaction: (
      state,
      action: PayloadAction<{
        conversationId: number;
        messageId: number;
        userId: number;
        emoji: string;
      }>,
    ) => {
      const { conversationId, messageId, userId, emoji } = action.payload;
      const list = state.messages[conversationId];
      if (!list) return;
      const msg = list.find((m) => m.id === messageId);
      if (!msg || msg.isDeleted) return;
      const reactions = msg.reactions ?? [];
      const exists = reactions.some((r) => r.userId === userId && r.emoji === emoji);
      if (exists) return;
      msg.reactions = [...reactions, { userId, emoji }];
    },
    removeMessageReaction: (
      state,
      action: PayloadAction<{
        conversationId: number;
        messageId: number;
        userId: number;
        emoji: string;
      }>,
    ) => {
      const { conversationId, messageId, userId, emoji } = action.payload;
      const list = state.messages[conversationId];
      if (!list) return;
      const msg = list.find((m) => m.id === messageId);
      if (!msg) return;
      const reactions = msg.reactions ?? [];
      msg.reactions = reactions.filter((r) => !(r.userId === userId && r.emoji === emoji));
    },
    markMessagesRead: (
      state,
      action: PayloadAction<{ conversationId: number; messageIds: number[]; myUserId: number }>,
    ) => {
      const { conversationId, messageIds, myUserId } = action.payload;
      const list = state.messages[conversationId];
      if (!list) return;
      const ids = new Set(messageIds);
      for (const msg of list) {
        if (msg.senderId === myUserId && ids.has(msg.id)) {
          msg.status = 1;
        }
      }
    },
    updateConversationState: (
      state,
      action: PayloadAction<{ conversationId: number; patch: Partial<ConversationDto> }>,
    ) => {
      const conv = state.conversations.find((c) => c.id === action.payload.conversationId);
      if (conv) {
        Object.assign(conv, action.payload.patch);
      }
    },
    removeConversation: (state, action: PayloadAction<number>) => {
      state.conversations = state.conversations.filter((c) => c.id !== action.payload);
      delete state.messages[action.payload];
      delete state.messageHasMore[action.payload];
      delete state.messagePrevIds[action.payload];
    },
    setTotalUnreadCount: (state, action: PayloadAction<number>) => {
      state.totalUnreadCount = Math.max(0, action.payload);
    },
    resetChat: () => initialState,
  },
});

export const {
  setConversations,
  addConversations,
  addConversation,
  updateConversationWithLastMessage,
  updateConversationFromNotification,
  setActiveConversation,
  resetUnreadCount,
  setConversationBlocked,
  setConversationUnblocked,
  setMessages,
  prependMessages,
  mergeMessages,
  appendMessage,
  updateMessage,
  deleteMessage,
  mergeMessageReaction,
  removeMessageReaction,
  markMessagesRead,
  updateConversationState,
  removeConversation,
  setTotalUnreadCount,
  resetChat,
} = chatSlice.actions;
export const chatReducer = chatSlice.reducer;
