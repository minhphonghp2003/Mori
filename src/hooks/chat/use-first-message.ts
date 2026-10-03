import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { getOpponentConversation, createConversation } from "@/services/chat";
import { MessageType } from "@/types/chat";
import type { User } from "@/types";

/**
 * First-message flow shared by the /home roster and the location profile
 * dialog. Tapping chat checks for an existing 1:1 conversation (opens it
 * directly); otherwise a modal collects the greeting, creates the
 * conversation with receiverId only, sends the greeting as the first
 * message, then opens the room.
 */
export interface GreetingMoment {
  id: string;
  previewImage?: string;
}

export const useFirstMessage = () => {
  const { openChatWithUser, sendMessage, showToast } = useApp();
  const [greetingTarget, setGreetingTarget] = useState<User | null>(null);
  const [greetingText, setGreetingText] = useState("");
  const [greetingMoment, setGreetingMoment] = useState<GreetingMoment | null>(null);
  const [isCheckingChat, setIsCheckingChat] = useState(false);
  const [isSendingGreeting, setIsSendingGreeting] = useState(false);

  const startGreetingChat = async (user: User, moment?: GreetingMoment) => {
    const uid = Number(user.id);
    if (!uid || isCheckingChat || isSendingGreeting) return;
    setIsCheckingChat(true);
    try {
      const existing = await getOpponentConversation(uid);
      if (existing?.data) {
        await openChatWithUser(user, moment?.id);
      } else {
        setGreetingText("");
        setGreetingTarget(user);
        setGreetingMoment(moment ?? null);
      }
    } catch {
      // Fall back to the direct flow (it toasts on failure itself).
      await openChatWithUser(user, moment?.id);
    } finally {
      setIsCheckingChat(false);
    }
  };

  const closeGreeting = () => {
    if (isSendingGreeting) return;
    setGreetingTarget(null);
    setGreetingMoment(null);
  };

  const sendGreeting = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = greetingTarget;
    const content = greetingText.trim();
    const uid = Number(target?.id);
    if (!target || !uid || !content || isSendingGreeting) return;
    setIsSendingGreeting(true);
    try {
      // 1. Create the 1:1 conversation (receiverId only, no content).
      const created = await createConversation(uid, null, MessageType.Text);
      const convId = created?.data;
      if (!convId) return;
      // 2. Send the greeting as the first message (hub SendMessage —
      // failures are toasted inside; keep the modal open for retry).
      const sent = await sendMessage(String(convId), content);
      if (!sent) return;
      const momentId = greetingMoment?.id;
      setGreetingTarget(null);
      setGreetingText("");
      setGreetingMoment(null);
      showToast("Đã gửi lời chào 👋", "success");
      // 3. Move to that chat conversation screen (moment still attaches
      // via ?momentId= for the share flow).
      await openChatWithUser(target, momentId ?? undefined);
    } catch {
      // Axios errors are already toasted by the interceptor — keep the
      // modal open so the user can retry without losing their message.
    } finally {
      setIsSendingGreeting(false);
    }
  };

  return {
    greetingTarget,
    greetingText,
    setGreetingText,
    greetingMoment,
    isSendingGreeting,
    startGreetingChat,
    closeGreeting,
    sendGreeting,
  };
};
