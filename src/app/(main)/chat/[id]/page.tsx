"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { ChatRoomView } from "@/components/chat/ChatRoomView";

export default function ChatRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { setActiveConversationId } = useApp();
  const [pendingMomentId, setPendingMomentId] = useState<string | null>(null);

  useEffect(() => {
    setActiveConversationId(params.id);
    setPendingMomentId(new URLSearchParams(window.location.search).get("momentId"));
    return () => setActiveConversationId(null);
  }, [params.id, setActiveConversationId]);

  return (
    <ChatRoomView
      conversationId={params.id}
      pendingMomentId={pendingMomentId}
      onBack={() => router.push("/chat")}
    />
  );
}
