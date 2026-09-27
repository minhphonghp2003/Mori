"use client";

import type { ReactNode } from "react";
import { ReduxProvider } from "./redux-provider";
import { AuthProvider } from "./auth-provider";
import { ThemeProvider } from "./theme-provider";
import { AppProvider } from "@/context/AppContext";
import { PushListener } from "./push-listener";
import { SwUpdateBanner } from "@/components/common/SwUpdateBanner";
import { ToastContainer } from "@/components/common/Toast";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Root-level provider stack — mounted for every route (auth screens included)
 * so useAuth/useApp/toasts work everywhere. The design ToastContainer lives
 * here (not inside MobileShell) to cover auth pages as well.
 */
export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ReduxProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppProvider>
            <PushListener>
              {children}
              <SwUpdateBanner />
              <ToastContainer />
            </PushListener>
          </AppProvider>
        </ThemeProvider>
      </AuthProvider>
    </ReduxProvider>
  );
};
