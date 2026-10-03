import { describe, expect, it } from "vitest";
import {
  chatReducer,
  patchMessageAttachment,
  setConversations,
  setMessages,
} from "../chat-slice";
import type { ConversationDto, MessageDto } from "@/types/chat";

const msg = (
  id: number,
  attachments: { originalUrl: string; thumbUrl: string }[],
) =>
  ({
    id,
    conversationId: 7,
    senderId: 1,
    senderName: "A",
    senderAvatar: null,
    senderRole: "",
    content: null,
    replyToId: null,
    repliedMessage: null,
    type: "File",
    attachments,
    createdAt: "",
    isDeleted: false,
    momentThumbnail: null,
  }) as MessageDto;

const convWithLastMessage = (attachments: { originalUrl: string; thumbUrl: string }[]) =>
  ({
    id: 7,
    name: "Direct",
    isDirect: true,
    isRestricted: false,
    isMuted: false,
    memberCount: 2,
    isOnline: true,
    unreadCount: 0,
    isBlocked: false,
    blockedById: null,
    image: null,
    lastMessage: msg(99, attachments),
  }) as ConversationDto;

describe("patchMessageAttachment", () => {
  it("fills an empty thumb on exact originalUrl match", () => {
    let state = chatReducer(
      undefined,
      setMessages({
        conversationId: 7,
        messages: [msg(1, [{ originalUrl: "https://cdn/x/raw.jpg", thumbUrl: "" }])],
        hasMore: false,
        prevId: null,
      }),
    );
    state = chatReducer(
      state,
      patchMessageAttachment({
        originalUrl: "https://cdn/x/raw.jpg",
        thumbUrl: "https://cdn/x/thumb.webp",
      }),
    );
    expect(state.messages[7][0].attachments[0].thumbUrl).toBe("https://cdn/x/thumb.webp");
  });

  it("matches CDN urls against storage keys by folder suffix", () => {
    let state = chatReducer(
      undefined,
      setMessages({
        conversationId: 7,
        messages: [
          msg(1, [{ originalUrl: "https://cdn.example.com/users/1/chat/g1/original.webp", thumbUrl: "" }]),
        ],
        hasMore: false,
        prevId: null,
      }),
    );
    state = chatReducer(
      state,
      patchMessageAttachment({
        originalKey: "users/1/chat/g1/raw.jpg",
        thumbUrl: "https://cdn.example.com/users/1/chat/g1/thumb.webp",
      }),
    );
    expect(state.messages[7][0].attachments[0].thumbUrl).toBe(
      "https://cdn.example.com/users/1/chat/g1/thumb.webp",
    );
  });

  it("leaves non-matching attachments and existing thumbs alone", () => {
    let state = chatReducer(
      undefined,
      setMessages({
        conversationId: 7,
        messages: [
          msg(1, [
            { originalUrl: "https://cdn/other.jpg", thumbUrl: "" },
            { originalUrl: "https://cdn/x/raw.jpg", thumbUrl: "https://cdn/x/old-thumb.webp" },
          ]),
        ],
        hasMore: false,
        prevId: null,
      }),
    );
    state = chatReducer(
      state,
      patchMessageAttachment({
        originalUrl: "https://cdn/x/raw.jpg",
        thumbUrl: "https://cdn/x/new-thumb.webp",
      }),
    );
    expect(state.messages[7][0].attachments[0].thumbUrl).toBe("");
    expect(state.messages[7][0].attachments[1].thumbUrl).toBe("https://cdn/x/old-thumb.webp");
  });

  it("also patches the conversation list preview row", () => {
    let state = chatReducer(
      undefined,
      setConversations({
        data: [convWithLastMessage([{ originalUrl: "https://cdn/x/raw.jpg", thumbUrl: "" }])],
        hasMore: false,
      }),
    );
    state = chatReducer(
      state,
      patchMessageAttachment({
        originalUrl: "https://cdn/x/raw.jpg",
        thumbUrl: "https://cdn/x/thumb.webp",
      }),
    );
    expect(state.conversations[0].lastMessage?.attachments[0].thumbUrl).toBe(
      "https://cdn/x/thumb.webp",
    );
  });
});
