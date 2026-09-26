"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { store } from "@/store";
import { useAuth } from "@/providers/auth-provider";
import { appHub } from "@/lib/signalr/app-hub";
import { emitToast } from "@/lib/toast";
import { getConversations } from "@/services/chat";
import {
  addConversation,
  appendMessage,
  deleteMessage as deleteMessageAction,
  markMessagesRead,
  mergeMessageReaction,
  removeConversation,
  removeMessageReaction,
  setConversations,
  setTotalUnreadCount,
  updateConversationFromNotification,
  updateConversationWithLastMessage,
  updateMessage,
} from "@/store/slices/chat-slice";

/**
 * Owns the app-wide SignalR lifecycle and every chat subscription that is not
 * scoped to a single room (the room handles typing/scroll locally). Mounted
 * once inside the authenticated main layout, so it only runs while logged in.
 *
 * Location/Phase-3 subscriptions must NOT start/stop the hub — this component
 * is the single owner of that.
 */
export function ChatSync({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const auth = useAuth();
  const myId = useAppSelector((s) => s.auth.user?.id);
  const ready = auth.hydrated && auth.isAuthenticated && !!myId;

  const myIdRef = useRef(myId);
  const logoutRef = useRef(auth.logout);
  useEffect(() => {
    myIdRef.current = myId;
    logoutRef.current = auth.logout;
  });

  useEffect(() => {
    if (!ready || !myId) return;
    let disposed = false;
    const unsubs: Array<() => void> = [];

    const refresh = async () => {
      try {
        const res = await getConversations(undefined, 20);
        if (!disposed) {
          dispatch(setConversations({ data: res.data, hasMore: res.hasMore }));
        }
      } catch (err) {
        console.error("[ChatSync] refreshConversations failed:", err);
      }
    };

    (async () => {
      try {
        await appHub.start();
      } catch (err) {
        console.error("[ChatSync] appHub.start failed:", err);
        return;
      }
      if (disposed) return;

      unsubs.push(
        appHub.onReceiveMessage((msg) => {
          dispatch(
            appendMessage({ conversationId: msg.conversationId, message: msg }),
          );
          dispatch(
            updateConversationWithLastMessage({
              conversationId: msg.conversationId,
              message: msg,
              myUserId: myId,
            }),
          );
        }),
      );

      unsubs.push(
        appHub.onReceiveConversationUpdated((data) => {
          if (data.conversationId === store.getState().chat.activeConversationId) {
            return;
          }
          dispatch(updateConversationFromNotification(data));
        }),
      );

      // Single-slot subscription in the hub — detach by overwriting on cleanup.
      appHub.onReceiveNewConversation((conv, initial) => {
        if (disposed) return;
        dispatch(addConversation(conv.lastMessage ? conv : { ...conv, lastMessage: initial }));
        if (conv.id != null && initial) {
          dispatch(appendMessage({ conversationId: conv.id, message: initial }));
        }
        if (conv.name) emitToast(`Cuộc trò chuyện mới: ${conv.name}`, "info");
      });

      unsubs.push(
        appHub.onReceiveUnreadCount((count) => {
          dispatch(setTotalUnreadCount(count));
        }),
      );

      unsubs.push(
        appHub.onReceiveMessageEdited((msg) => {
          dispatch(
            updateMessage({ conversationId: msg.conversationId, message: msg }),
          );
        }),
      );

      unsubs.push(
        appHub.onReceiveMessageDeleted((messageId) => {
          const lists = store.getState().chat.messages;
          for (const key of Object.keys(lists)) {
            const convId = Number(key);
            if (lists[convId]?.some((m) => m.id === messageId)) {
              dispatch(
                deleteMessageAction({ conversationId: convId, messageId }),
              );
              break;
            }
          }
        }),
      );

      unsubs.push(
        appHub.onReceiveMessageReacted((data) => {
          dispatch(
            mergeMessageReaction({
              conversationId: data.conversationId,
              messageId: data.messageId,
              userId: data.userId,
              emoji: data.emoji,
            }),
          );
        }),
      );

      unsubs.push(
        appHub.onReceiveMessageReactedRemoved((data) => {
          dispatch(
            removeMessageReaction({
              conversationId: data.conversationId,
              messageId: data.messageId,
              userId: data.userId,
              emoji: data.emoji,
            }),
          );
        }),
      );

      unsubs.push(
        appHub.onReceiveMessagesRead((data) => {
          if (data.readerUserId === myIdRef.current) return;
          dispatch(
            markMessagesRead({
              conversationId: data.conversationId,
              messageIds: data.messageIds,
              myUserId: myIdRef.current!,
            }),
          );
        }),
      );

      unsubs.push(
        appHub.onReceiveChatBlocked((data) => {
          if (data.targetUserId === myIdRef.current) void refresh();
        }),
      );

      unsubs.push(
        appHub.onReceiveChatUnblocked((data) => {
          if (data.targetUserId === myIdRef.current) void refresh();
        }),
      );

      unsubs.push(
        appHub.onReceiveMemberRemoved((data) => {
          if (data.removedUserId === myIdRef.current) {
            const existed = store
              .getState()
              .chat.conversations.some((c) => c.id === data.conversationId);
            dispatch(removeConversation(data.conversationId));
            if (existed) {
              emitToast("Bạn đã bị xóa khỏi cuộc trò chuyện.", "error");
            }
          } else {
            void refresh();
          }
        }),
      );

      unsubs.push(
        appHub.onReceiveMemberLeft((data) => {
          if (data.leftUserId === myIdRef.current) {
            const existed = store
              .getState()
              .chat.conversations.some((c) => c.id === data.conversationId);
            dispatch(removeConversation(data.conversationId));
            if (existed) {
              emitToast("Bạn đã rời khỏi nhóm.", "info");
            }
          } else {
            void refresh();
          }
        }),
      );

      unsubs.push(
        appHub.onReceiveGroupDeleted((data) => {
          const existed = store
            .getState()
            .chat.conversations.some((c) => c.id === data.conversationId);
          dispatch(removeConversation(data.conversationId));
          if (existed) emitToast("Nhóm đã bị giải tán.", "error");
        }),
      );

      unsubs.push(
        appHub.onReceiveJoinRequestCreated((req) => {
          emitToast(`${req.userName} gửi yêu cầu tham gia nhóm.`, "info");
        }),
      );

      unsubs.push(
        appHub.onReceiveJoinRequestProcessed((data) => {
          if (data.userId !== myIdRef.current) return;
          if (data.result === 1) {
            emitToast(
              `Bạn đã được duyệt vào "${data.conversationName ?? "nhóm"}".`,
              "success",
            );
            void refresh();
          } else {
            emitToast(
              `Yêu cầu vào "${data.conversationName ?? "nhóm"}" bị từ chối.`,
              "error",
            );
          }
        }),
      );

      unsubs.push(
        appHub.onReconnected(() => {
          void refresh();
          // The open room's SignalR group membership died with the old
          // connection — re-join it or the thread goes silent (bug #2).
          const activeId = store.getState().chat.activeConversationId;
          if (activeId != null) {
            void appHub.joinConversation(Number(activeId)).catch((err) => {
              console.error("[ChatSync] re-join conversation failed:", err);
            });
          }
        }),
      );

      // Single-slot: detach on cleanup by replacing with a no-op.
      appHub.onKicked(() => {
        if (disposed) return;
        emitToast("Phiên đăng nhập đã bị đăng xuất ở thiết bị khác.", "error");
        void logoutRef.current();
      });
    })();

    return () => {
      disposed = true;
      for (const unsub of unsubs) unsub();
      appHub.onReceiveNewConversation(() => {});
      appHub.onKicked(() => {});
    };
  }, [ready, myId, dispatch]);

  return <>{children}</>;
}
