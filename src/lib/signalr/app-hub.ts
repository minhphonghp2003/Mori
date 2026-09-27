import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";
import { TOKEN_KEY } from "@/constants";
import type {
  MessageDto,
  ConversationDto,
  SendMessageRequest,
  AddMessageReactionRequest,
  MessageReactionNotificationDto,
  MessageReactionRemovedNotificationDto,
  MessageReadNotificationDto,
  ConversationUpdatedNotificationDto,
  JoinRequestDto,
  JoinRequestProcessedData,
} from "@/types/chat";
import type { FriendshipDto } from "@/types/friendship";
import type { MomentReactionNotification } from "@/types/moment";
import type { IncomingCallData, IncomingCallSignal, OutgoingCallSignal } from "@/types/call";
import type { JoinRequest, LocationDto, UserDto } from "./types";

export type KickedCallback = () => void;
export type ReceiveMessageCallback = (message: MessageDto) => void;
export type ReceiveNewConversationCallback = (
  conversation: ConversationDto,
  initialMessage: MessageDto,
) => void;
export type ReceiveFriendshipCreatedCallback = (dto: FriendshipDto) => void;
export type ReceiveFriendshipAcceptedCallback = (dto: FriendshipDto) => void;
export type ReceiveFriendshipBlockedCallback = (dto: FriendshipDto) => void;
export type ReceiveFriendshipUnblockedCallback = (dto: FriendshipDto) => void;

export interface EditMessageRequest {
  conversationId: number;
  messageId: number;
  content: string;
}

export interface DeleteMessageRequest {
  conversationId: number;
  messageId: number;
}

export type ReceiveMessageEditedCallback = (message: MessageDto) => void;
export type ReceiveMessageDeletedCallback = (messageId: number) => void;
export type ReceiveMessageReactedCallback = (data: MessageReactionNotificationDto) => void;
export type ReceiveMessageReactedRemovedCallback = (
  data: MessageReactionRemovedNotificationDto,
) => void;
export type ReceiveMessagesReadCallback = (data: MessageReadNotificationDto) => void;
export type ReceiveConversationUpdatedCallback = (data: ConversationUpdatedNotificationDto) => void;

export interface TypingData {
  conversationId: number;
  userId: number;
  userName: string;
  isTyping: boolean;
}

export type ReceiveTypingCallback = (data: TypingData) => void;
export type ReceiveCallCallback = (data: IncomingCallData) => void;
export type ReceiveCallSignalCallback = (data: IncomingCallSignal) => void;

export interface ChatBlockedData {
  blockerUserId?: number;
  targetUserId: number;
}

export type ReceiveChatBlockedCallback = (data: ChatBlockedData) => void;
export type ReceiveChatUnblockedCallback = (data: ChatBlockedData) => void;
export type ReceiveMomentReactedCallback = (data: MomentReactionNotification) => void;

export interface MemberRemovedData {
  conversationId: number;
  removedUserId: number;
  removedUserName: string;
}

export interface MemberLeftData {
  conversationId: number;
  leftUserId: number;
  leftUserName: string;
}

export type ReceiveMemberRemovedCallback = (data: MemberRemovedData) => void;
export type ReceiveMemberLeftCallback = (data: MemberLeftData) => void;

export type ReceiveJoinRequestCreatedCallback = (joinRequest: JoinRequestDto) => void;
export type ReceiveJoinRequestProcessedCallback = (data: JoinRequestProcessedData) => void;

export interface GroupDeletedNotification {
  conversationId: number;
}

export type ReceiveGroupDeletedCallback = (data: GroupDeletedNotification) => void;
export type ReceiveUnreadCountCallback = (unreadCount: number) => void;

export interface FileMarkedSuccessData {
  originalKey: string;
  thumbKey: string;
  originalUrl: string;
  thumbUrl: string;
  fileId?: string;
  key?: string;
}

export type ReceiveFileMarkedSuccessCallback = (data: FileMarkedSuccessData) => void;

// Location events (merged from the retired LocationHub)
export type ReceiveLocationsCallback = (locations: LocationDto[]) => void;
export type NewJoinCallback = (user: UserDto, location: LocationDto) => void;
export type UserDisconnectCallback = (userId: number) => void;
export type ReceiveOtherMovementCallback = (location: LocationDto) => void;
export type ReceiveVisibilityUpdatedCallback = (location: LocationDto) => void;
export type ReceiveBatteryUpdatedCallback = (location: LocationDto) => void;
export type ReceiveStatusUpdatedCallback = (location: LocationDto) => void;
export type ReconnectedCallback = () => void;

class AppHub {
  private connection: signalR.HubConnection | null = null;
  private epoch = 0;
  private connectionReady: Promise<void> | null = null;
  private kickedCallback: KickedCallback | null = null;
  private receiveMessageCallbacks: Set<ReceiveMessageCallback> = new Set();
  private receiveMessageEditedCallbacks: Set<ReceiveMessageEditedCallback> = new Set();
  private receiveMessageDeletedCallbacks: Set<ReceiveMessageDeletedCallback> = new Set();
  private receiveMessageReactedCallbacks: Set<ReceiveMessageReactedCallback> = new Set();
  private receiveMessageReactedRemovedCallbacks: Set<ReceiveMessageReactedRemovedCallback> =
    new Set();
  private receiveMessagesReadCallbacks: Set<ReceiveMessagesReadCallback> = new Set();
  private receiveConversationUpdatedCallbacks: Set<ReceiveConversationUpdatedCallback> = new Set();
  private receiveNewConversationCallback: ReceiveNewConversationCallback | null = null;
  private receiveFriendshipCreatedCallbacks: Set<ReceiveFriendshipCreatedCallback> = new Set();
  private receiveFriendshipAcceptedCallbacks: Set<ReceiveFriendshipAcceptedCallback> = new Set();
  private receiveFriendshipBlockedCallbacks: Set<ReceiveFriendshipBlockedCallback> = new Set();
  private receiveFriendshipUnblockedCallbacks: Set<ReceiveFriendshipUnblockedCallback> = new Set();
  private receiveChatBlockedCallbacks: Set<ReceiveChatBlockedCallback> = new Set();
  private receiveChatUnblockedCallbacks: Set<ReceiveChatUnblockedCallback> = new Set();
  private receiveTypingCallbacks: Set<ReceiveTypingCallback> = new Set();
  private receiveCallCallbacks: Set<ReceiveCallCallback> = new Set();
  private receiveCallSignalCallbacks: Set<ReceiveCallSignalCallback> = new Set();
  private receiveMomentReactedCallbacks: Set<ReceiveMomentReactedCallback> = new Set();
  private receiveFileMarkedSuccessCallbacks: Set<ReceiveFileMarkedSuccessCallback> = new Set();
  private receiveMemberRemovedCallbacks: Set<ReceiveMemberRemovedCallback> = new Set();
  private receiveMemberLeftCallbacks: Set<ReceiveMemberLeftCallback> = new Set();
  private receiveJoinRequestCreatedCallbacks: Set<ReceiveJoinRequestCreatedCallback> = new Set();
  private receiveJoinRequestProcessedCallbacks: Set<ReceiveJoinRequestProcessedCallback> =
    new Set();
  private receiveGroupDeletedCallbacks: Set<ReceiveGroupDeletedCallback> = new Set();
  private receiveUnreadCountCallbacks: Set<ReceiveUnreadCountCallback> = new Set();
  private receiveLocationsCallbacks: Set<ReceiveLocationsCallback> = new Set();
  private newJoinCallbacks: Set<NewJoinCallback> = new Set();
  private userDisconnectCallbacks: Set<UserDisconnectCallback> = new Set();
  private receiveOtherMovementCallbacks: Set<ReceiveOtherMovementCallback> = new Set();
  private receiveVisibilityUpdatedCallbacks: Set<ReceiveVisibilityUpdatedCallback> = new Set();
  private receiveBatteryUpdatedCallbacks: Set<ReceiveBatteryUpdatedCallback> = new Set();
  private receiveStatusUpdatedCallbacks: Set<ReceiveStatusUpdatedCallback> = new Set();
  private reconnectedCallbacks: Set<ReconnectedCallback> = new Set();
  private joinedConversations: Set<number> = new Set();

  async start(): Promise<void> {
    // Serialize concurrent starts: the chat room page effect can beat the
    // ChatSync provider effect to this call — whoever arrives second must wait
    // for the first attempt instead of tearing down its in-flight connection.
    if (this.connectionReady) {
      try {
        await this.connectionReady;
      } catch {}
      if (this.connection?.state === signalR.HubConnectionState.Connected) {
        return;
      }
    }

    const myEpoch = ++this.epoch;

    if (this.connection) {
      const state = this.connection.state;
      if (state === signalR.HubConnectionState.Connected) {
        return;
      }
      const oldConnection = this.connection;
      this.connection = null;
      try {
        await oldConnection.stop();
      } catch {}
    }

    if (myEpoch !== this.epoch) return;

    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      console.warn("[AppHub] No token available, skipping connection");
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(env.NEXT_PUBLIC_SIGNALR_APP_URL, {
        // Read the token fresh on every (re)connect — the access token
        // rotates every ~1 min (API doc §2) and a captured closure value
        // would reconnect with a stale, rejected JWT.
        accessTokenFactory: () =>
          (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null) ?? "",
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on("ReceiveKicked", () => {
      console.log("[AppHub] Kicked by another connection");
      this.kickedCallback?.();
    });

    this.connection.on("ReceiveMessage", (message: MessageDto) => {
      this.receiveMessageCallbacks.forEach((cb) => cb(message));
    });

    this.connection.on("ReceiveMessageEdited", (message: MessageDto) => {
      this.receiveMessageEditedCallbacks.forEach((cb) => cb(message));
    });

    this.connection.on("ReceiveMessageDeleted", (messageId: number) => {
      this.receiveMessageDeletedCallbacks.forEach((cb) => cb(messageId));
    });

    this.connection.on("ReceiveMessageReacted", (data: MessageReactionNotificationDto) => {
      this.receiveMessageReactedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on(
      "ReceiveMessageReactedRemoved",
      (data: MessageReactionRemovedNotificationDto) => {
        this.receiveMessageReactedRemovedCallbacks.forEach((cb) => cb(data));
      },
    );

    this.connection.on("ReceiveMessagesRead", (data: MessageReadNotificationDto) => {
      this.receiveMessagesReadCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveConversationUpdated", (data: ConversationUpdatedNotificationDto) => {
      this.receiveConversationUpdatedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on(
      "ReceiveNewConversation",
      (conversation: ConversationDto, initialMessage: MessageDto) => {
        this.receiveNewConversationCallback?.(conversation, initialMessage);
      },
    );

    this.connection.on("ReceiveFriendshipCreated", (dto: FriendshipDto) => {
      this.receiveFriendshipCreatedCallbacks.forEach((cb) => cb(dto));
    });

    this.connection.on("ReceiveFriendshipAccepted", (dto: FriendshipDto) => {
      this.receiveFriendshipAcceptedCallbacks.forEach((cb) => cb(dto));
    });

    this.connection.on("ReceiveFriendshipBlocked", (dto: FriendshipDto) => {
      this.receiveFriendshipBlockedCallbacks.forEach((cb) => cb(dto));
    });

    this.connection.on("ReceiveFriendshipUnblocked", (dto: FriendshipDto) => {
      this.receiveFriendshipUnblockedCallbacks.forEach((cb) => cb(dto));
    });

    this.connection.on("ReceiveChatBlocked", (data: ChatBlockedData) => {
      this.receiveChatBlockedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveChatUnblocked", (data: ChatBlockedData) => {
      this.receiveChatUnblockedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveTyping", (data: TypingData) => {
      this.receiveTypingCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveCall", (data: IncomingCallData) => {
      this.receiveCallCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveCallSignal", (data: IncomingCallSignal) => {
      this.receiveCallSignalCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveMomentReacted", (data: MomentReactionNotification) => {
      this.receiveMomentReactedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveFileMarkedSuccess", (data: FileMarkedSuccessData) => {
      this.receiveFileMarkedSuccessCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveMemberRemoved", (data: MemberRemovedData) => {
      this.receiveMemberRemovedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveMemberLeft", (data: MemberLeftData) => {
      this.receiveMemberLeftCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveJoinRequestCreated", (joinRequest: JoinRequestDto) => {
      this.receiveJoinRequestCreatedCallbacks.forEach((cb) => cb(joinRequest));
    });

    this.connection.on("ReceiveJoinRequestProcessed", (data: JoinRequestProcessedData) => {
      this.receiveJoinRequestProcessedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveGroupDeleted", (data: GroupDeletedNotification) => {
      this.receiveGroupDeletedCallbacks.forEach((cb) => cb(data));
    });

    this.connection.on("ReceiveUnreadCount", (unreadCount: number) => {
      // Error handling and validation
      if (typeof unreadCount !== 'number') {
        console.error('[AppHub] Invalid unread count received:', unreadCount);
        return;
      }
      
      // Ensure non-negative value
      const safeCount = Math.max(0, unreadCount);
      this.receiveUnreadCountCallbacks.forEach((cb) => cb(safeCount));
    });

    // Location events (merged from the retired LocationHub)
    this.connection.on("ReceiveLocations", (locations: LocationDto[]) => {
      console.log("[AppHub] ReceiveLocations event fired:", locations.length, "locations");
      this.receiveLocationsCallbacks.forEach((cb) => cb(locations));
    });

    this.connection.on("NewJoin", (user: UserDto, location: LocationDto) => {
      console.log("[AppHub] NewJoin event fired:", user.name);
      this.newJoinCallbacks.forEach((cb) => cb(user, location));
    });

    this.connection.on("ReceiveUserDisconnect", (userId: number) => {
      console.log("[AppHub] User disconnected:", userId);
      this.userDisconnectCallbacks.forEach((cb) => cb(userId));
    });

    this.connection.on("ReceiveOtherMovement", (location: LocationDto) => {
      console.log("[AppHub] ReceiveOtherMovement event fired:", location.name);
      this.receiveOtherMovementCallbacks.forEach((cb) => cb(location));
    });

    this.connection.on("ReceiveVisibilityUpdated", (location: LocationDto) => {
      console.log("[AppHub] Visibility updated:", location);
      this.receiveVisibilityUpdatedCallbacks.forEach((cb) => cb(location));
    });

    this.connection.on("ReceiveBatteryUpdated", (location: LocationDto) => {
      console.log("[AppHub] Battery updated:", location);
      this.receiveBatteryUpdatedCallbacks.forEach((cb) => cb(location));
    });

    this.connection.on("ReceiveStatusUpdated", (location: LocationDto) => {
      console.log("[AppHub] Status updated:", location);
      this.receiveStatusUpdatedCallbacks.forEach((cb) => cb(location));
    });

    this.connection.onclose(() => {
      console.log("[AppHub] Disconnected");
    });

    this.connection.onreconnecting(() => {
      console.log("[AppHub] Reconnecting...");
    });

    this.connection.onreconnected(async () => {
      console.log("[AppHub] Reconnected");
      for (const convId of this.joinedConversations) {
        try {
          await this.connection?.invoke("JoinConversation", convId);
        } catch {}
      }
      // Let subscribers (chat list refetch, location resync) recover anything
      // missed while the socket was down — events are not replayed by SignalR.
      this.reconnectedCallbacks.forEach((cb) => {
        try {
          cb();
        } catch {}
      });
    });

    try {
      this.connectionReady = this.connection.start().then(() => {
        console.log("[AppHub] Connected");
      });
      await this.connectionReady;
    } catch (err) {
      this.connectionReady = null;
      if (myEpoch === this.epoch) {
        this.connection = null;
        throw err;
      }
    }
  }

  /**
   * Tear down the connection.
   *
   * @param options.preserveListeners When true, registered callbacks are kept so
   *   that a subsequent `start()` (e.g. token-refresh reconnect) re-delivers
   *   events without callers having to re-subscribe. Defaults to false so
   *   logout/teardown fully resets hub state. The retired LocationHub preserved
   *   its listeners across stop/start, so token-refresh reconnects pass true.
   */
  async stop(options?: { preserveListeners?: boolean }): Promise<void> {
    ++this.epoch;
    this.connectionReady = null;
    // Conversation group membership is tracked per connection and re-joined
    // on reconnect — keep it across a token-refresh stop/start, only wipe it
    // on full teardown (logout).
    if (!options?.preserveListeners) {
      this.joinedConversations.clear();
    }
    if (options?.preserveListeners) {
      const conn = this.connection;
      if (conn) {
        this.connection = null;
        try {
          await conn.stop();
        } catch {}
      }
      return;
    }
    this.receiveFriendshipCreatedCallbacks.clear();
    this.receiveFriendshipAcceptedCallbacks.clear();
    this.receiveFriendshipBlockedCallbacks.clear();
    this.receiveFriendshipUnblockedCallbacks.clear();
    this.receiveChatBlockedCallbacks.clear();
    this.receiveChatUnblockedCallbacks.clear();
    this.receiveMessageCallbacks.clear();
    this.receiveMessageEditedCallbacks.clear();
    this.receiveMessageDeletedCallbacks.clear();
    this.receiveMessageReactedCallbacks.clear();
    this.receiveMessageReactedRemovedCallbacks.clear();
    this.receiveMessagesReadCallbacks.clear();
    this.receiveConversationUpdatedCallbacks.clear();
    this.receiveTypingCallbacks.clear();
    this.receiveCallCallbacks.clear();
    this.receiveCallSignalCallbacks.clear();
    this.receiveMomentReactedCallbacks.clear();
    this.receiveFileMarkedSuccessCallbacks.clear();
    this.receiveMemberRemovedCallbacks.clear();
    this.receiveMemberLeftCallbacks.clear();
    this.receiveJoinRequestCreatedCallbacks.clear();
    this.receiveJoinRequestProcessedCallbacks.clear();
    this.receiveGroupDeletedCallbacks.clear();
    this.receiveLocationsCallbacks.clear();
    this.newJoinCallbacks.clear();
    this.userDisconnectCallbacks.clear();
    this.receiveOtherMovementCallbacks.clear();
    this.receiveVisibilityUpdatedCallbacks.clear();
    this.receiveBatteryUpdatedCallbacks.clear();
    this.receiveStatusUpdatedCallbacks.clear();
    this.reconnectedCallbacks.clear();
    this.kickedCallback = null;
    this.receiveNewConversationCallback = null;
    const conn = this.connection;
    if (conn) {
      this.connection = null;
      try {
        await conn.stop();
      } catch {}
    }
  }

  async sendMessage(dto: SendMessageRequest): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("SendMessage", dto);
  }

  async editMessage(dto: EditMessageRequest): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("EditMessage", dto);
  }

  async deleteMessage(dto: DeleteMessageRequest): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("DeleteMessage", dto);
  }

  async reactMessage(dto: AddMessageReactionRequest): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("ReactMessage", dto);
  }

  async removeReactMessage(dto: AddMessageReactionRequest): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("RemoveReactMessage", dto);
  }

  async sendTyping(conversationId: number, isTyping: boolean): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("Typing", conversationId, isTyping);
  }

  async call(targetUserId: number, hasVideo?: boolean): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("Call", { targetUserId, hasVideo });
  }

  async sendCallSignal(dto: OutgoingCallSignal): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("CallSignal", dto);
  }

  async join(request: JoinRequest): Promise<void> {
    if (!this.connection) {
      console.warn("[AppHub] Cannot join - no active connection");
      return;
    }

    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      console.warn("[AppHub] Cannot join - connection not in Connected state");
      return;
    }

    try {
      await this.connection.invoke("Join", request);
    } catch (err) {
      console.error("[AppHub] Join error:", err);
      throw err;
    }
  }

  async updateLocation(
    latitude: number,
    longitude: number,
    accuracy?: number,
    speed?: number,
  ): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.invoke("UpdateLocation", latitude, longitude, accuracy, speed);
    } catch (err) {
      console.error("[AppHub] UpdateLocation error:", err);
    }
  }

  async updateVisibility(visibility: number): Promise<void> {
    const conn = await this.ensureSendable();
    await conn.invoke("UpdateVisibility", visibility);
  }

  /**
   * Wait for any in-flight start, then require a live connection.
   * User-initiated updates (status/visibility) must fail loudly instead of
   * vanishing while the hub is down — the UI only confirms after this.
   */
  private async ensureSendable(): Promise<signalR.HubConnection> {
    if (this.connectionReady) {
      try {
        await this.connectionReady;
      } catch {}
    }
    const conn = this.connection;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      throw new Error("AppHub not connected");
    }
    return conn;
  }

  async updateBattery(battery: number): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.invoke("UpdateBattery", battery);
    } catch (err) {
      console.error("[AppHub] UpdateBattery error:", err);
    }
  }

  async updateStatus(status: string): Promise<void> {
    const conn = await this.ensureSendable();
    await conn.invoke("UpdateStatus", status);
  }

  async joinConversation(id: number): Promise<void> {
    if (this.connectionReady) await this.connectionReady;
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("JoinConversation", id);
    this.joinedConversations.add(id);
  }

  async leaveConversation(id: number): Promise<void> {
    if (!this.connection) throw new Error("AppHub not connected");
    await this.connection.invoke("LeaveConversation", id);
    this.joinedConversations.delete(id);
  }

  onKicked(callback: KickedCallback): void {
    this.kickedCallback = callback;
  }

  onReceiveMessage(callback: ReceiveMessageCallback): () => void {
    this.receiveMessageCallbacks.add(callback);
    return () => {
      this.receiveMessageCallbacks.delete(callback);
    };
  }

  onReceiveMessageEdited(callback: ReceiveMessageEditedCallback): () => void {
    this.receiveMessageEditedCallbacks.add(callback);
    return () => {
      this.receiveMessageEditedCallbacks.delete(callback);
    };
  }

  onReceiveMessageDeleted(callback: ReceiveMessageDeletedCallback): () => void {
    this.receiveMessageDeletedCallbacks.add(callback);
    return () => {
      this.receiveMessageDeletedCallbacks.delete(callback);
    };
  }

  onReceiveMessageReacted(callback: ReceiveMessageReactedCallback): () => void {
    this.receiveMessageReactedCallbacks.add(callback);
    return () => {
      this.receiveMessageReactedCallbacks.delete(callback);
    };
  }

  onReceiveMessageReactedRemoved(callback: ReceiveMessageReactedRemovedCallback): () => void {
    this.receiveMessageReactedRemovedCallbacks.add(callback);
    return () => {
      this.receiveMessageReactedRemovedCallbacks.delete(callback);
    };
  }

  onReceiveMessagesRead(callback: ReceiveMessagesReadCallback): () => void {
    this.receiveMessagesReadCallbacks.add(callback);
    return () => {
      this.receiveMessagesReadCallbacks.delete(callback);
    };
  }

  onReceiveConversationUpdated(callback: ReceiveConversationUpdatedCallback): () => void {
    this.receiveConversationUpdatedCallbacks.add(callback);
    return () => {
      this.receiveConversationUpdatedCallbacks.delete(callback);
    };
  }

  onReceiveNewConversation(callback: ReceiveNewConversationCallback): void {
    this.receiveNewConversationCallback = callback;
  }

  onReceiveFriendshipCreated(callback: ReceiveFriendshipCreatedCallback): () => void {
    this.receiveFriendshipCreatedCallbacks.add(callback);
    return () => {
      this.receiveFriendshipCreatedCallbacks.delete(callback);
    };
  }

  onReceiveFriendshipAccepted(callback: ReceiveFriendshipAcceptedCallback): () => void {
    this.receiveFriendshipAcceptedCallbacks.add(callback);
    return () => {
      this.receiveFriendshipAcceptedCallbacks.delete(callback);
    };
  }

  onReceiveFriendshipBlocked(callback: ReceiveFriendshipBlockedCallback): () => void {
    this.receiveFriendshipBlockedCallbacks.add(callback);
    return () => {
      this.receiveFriendshipBlockedCallbacks.delete(callback);
    };
  }

  onReceiveFriendshipUnblocked(callback: ReceiveFriendshipUnblockedCallback): () => void {
    this.receiveFriendshipUnblockedCallbacks.add(callback);
    return () => {
      this.receiveFriendshipUnblockedCallbacks.delete(callback);
    };
  }

  onReceiveChatBlocked(callback: ReceiveChatBlockedCallback): () => void {
    this.receiveChatBlockedCallbacks.add(callback);
    return () => {
      this.receiveChatBlockedCallbacks.delete(callback);
    };
  }

  onReceiveChatUnblocked(callback: ReceiveChatUnblockedCallback): () => void {
    this.receiveChatUnblockedCallbacks.add(callback);
    return () => {
      this.receiveChatUnblockedCallbacks.delete(callback);
    };
  }

  onReceiveTyping(callback: ReceiveTypingCallback): () => void {
    this.receiveTypingCallbacks.add(callback);
    return () => {
      this.receiveTypingCallbacks.delete(callback);
    };
  }

  onReceiveCall(callback: ReceiveCallCallback): () => void {
    this.receiveCallCallbacks.add(callback);
    return () => {
      this.receiveCallCallbacks.delete(callback);
    };
  }

  onReceiveCallSignal(callback: ReceiveCallSignalCallback): () => void {
    this.receiveCallSignalCallbacks.add(callback);
    return () => {
      this.receiveCallSignalCallbacks.delete(callback);
    };
  }

  onReceiveMomentReacted(callback: ReceiveMomentReactedCallback): () => void {
    this.receiveMomentReactedCallbacks.add(callback);
    return () => {
      this.receiveMomentReactedCallbacks.delete(callback);
    };
  }

  onReceiveFileMarkedSuccess(callback: ReceiveFileMarkedSuccessCallback): () => void {
    this.receiveFileMarkedSuccessCallbacks.add(callback);
    return () => {
      this.receiveFileMarkedSuccessCallbacks.delete(callback);
    };
  }

  onReceiveMemberRemoved(callback: ReceiveMemberRemovedCallback): () => void {
    this.receiveMemberRemovedCallbacks.add(callback);
    return () => {
      this.receiveMemberRemovedCallbacks.delete(callback);
    };
  }

  onReceiveMemberLeft(callback: ReceiveMemberLeftCallback): () => void {
    this.receiveMemberLeftCallbacks.add(callback);
    return () => {
      this.receiveMemberLeftCallbacks.delete(callback);
    };
  }

  onReceiveJoinRequestCreated(callback: ReceiveJoinRequestCreatedCallback): () => void {
    this.receiveJoinRequestCreatedCallbacks.add(callback);
    return () => {
      this.receiveJoinRequestCreatedCallbacks.delete(callback);
    };
  }

  onReceiveJoinRequestProcessed(callback: ReceiveJoinRequestProcessedCallback): () => void {
    this.receiveJoinRequestProcessedCallbacks.add(callback);
    return () => {
      this.receiveJoinRequestProcessedCallbacks.delete(callback);
    };
  }

  onReceiveGroupDeleted(callback: ReceiveGroupDeletedCallback): () => void {
    this.receiveGroupDeletedCallbacks.add(callback);
    return () => {
      this.receiveGroupDeletedCallbacks.delete(callback);
    };
  }

  onReceiveUnreadCount(callback: ReceiveUnreadCountCallback): () => void {
    this.receiveUnreadCountCallbacks.add(callback);
    return () => {
      this.receiveUnreadCountCallbacks.delete(callback);
    };
  }

  onReconnected(callback: ReconnectedCallback): () => void {
    this.reconnectedCallbacks.add(callback);
    return () => {
      this.reconnectedCallbacks.delete(callback);
    };
  }

  // Location event subscriptions (merged from the retired LocationHub)
  onReceiveLocations(callback: ReceiveLocationsCallback): () => void {
    this.receiveLocationsCallbacks.add(callback);
    return () => {
      this.receiveLocationsCallbacks.delete(callback);
    };
  }

  onNewJoin(callback: NewJoinCallback): () => void {
    this.newJoinCallbacks.add(callback);
    return () => {
      this.newJoinCallbacks.delete(callback);
    };
  }

  onUserDisconnect(callback: UserDisconnectCallback): () => void {
    this.userDisconnectCallbacks.add(callback);
    return () => {
      this.userDisconnectCallbacks.delete(callback);
    };
  }

  onReceiveOtherMovement(callback: ReceiveOtherMovementCallback): () => void {
    this.receiveOtherMovementCallbacks.add(callback);
    return () => {
      this.receiveOtherMovementCallbacks.delete(callback);
    };
  }

  onReceiveVisibilityUpdated(callback: ReceiveVisibilityUpdatedCallback): () => void {
    this.receiveVisibilityUpdatedCallbacks.add(callback);
    return () => {
      this.receiveVisibilityUpdatedCallbacks.delete(callback);
    };
  }

  onReceiveBatteryUpdated(callback: ReceiveBatteryUpdatedCallback): () => void {
    this.receiveBatteryUpdatedCallbacks.add(callback);
    return () => {
      this.receiveBatteryUpdatedCallbacks.delete(callback);
    };
  }

  onReceiveStatusUpdated(callback: ReceiveStatusUpdatedCallback): () => void {
    this.receiveStatusUpdatedCallbacks.add(callback);
    return () => {
      this.receiveStatusUpdatedCallbacks.delete(callback);
    };
  }

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }
}

export const appHub = new AppHub();
