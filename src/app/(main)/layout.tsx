"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MobileShell } from "@/components/layout/MobileShell";
import { useAuth } from "@/providers/auth-provider";
import { ChatSync } from "@/providers/chat-sync";
import { LocationProvider } from "@/providers/location-provider";
import { CallProvider } from "@/providers/call-provider";
import { appHub } from "@/lib/signalr/app-hub";

/**
 * Single auth guard for the main app (bug fix: the old project had divergent
 * guards on `/`). Unauthenticated visitors are parked on /init with their
 * intended destination saved to `last_page` so login can bring them back.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      appHub.stop();
      if (pathname && pathname !== "/") {
        localStorage.setItem("last_page", pathname);
      }
      router.replace("/init");
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated || !isAuthenticated) return null;

  return (
    <ChatSync>
      <LocationProvider>
        <CallProvider>
          <MobileShell>{children}</MobileShell>
        </CallProvider>
      </LocationProvider>
    </ChatSync>
  );
}
