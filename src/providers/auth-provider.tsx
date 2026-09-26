"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCredentials, logout } from "@/store/slices/auth-slice";
import { resetChat } from "@/store/slices/chat-slice";
import { resetLocation } from "@/store/slices/location-slice";
import { getUserById } from "@/services/user";
import { scheduleProactiveRefresh } from "@/lib/axios";
import {
  TOKEN_KEY,
  USER_ID_KEY,
  USER_INFO_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  REFRESH_TOKEN_EXPIRES_AT_KEY,
} from "@/constants";

interface AuthContextValue {
  isAuthenticated: boolean;
  /** False until localStorage session has been read (guards wait for this). */
  hydrated: boolean;
  user: { id: number; name: string; email: string } | null;
  token: string | null;
  login: (
    user: { id: number; name: string; email: string },
    token?: string,
    refreshToken?: string,
    expiresAt?: string,
    refreshTokenExpiresAt?: string,
  ) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated } = useAppSelector((state) => state.auth);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem(USER_ID_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const storedExpiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
    const storedRefreshExpiresAt = localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT_KEY);

    if (userId) {
      let name = "";
      let email = "";
      try {
        const storedInfo = localStorage.getItem(USER_INFO_KEY);
        if (storedInfo) {
          const info = JSON.parse(storedInfo);
          name = info.name ?? "";
          email = info.email ?? "";
        }
      } catch {}

      dispatch(
        setCredentials({
          user: { id: Number(userId), name, email },
          token: storedToken || undefined,
          refreshToken: storedRefreshToken || undefined,
          expiresAt: storedExpiresAt || undefined,
          refreshTokenExpiresAt: storedRefreshExpiresAt || undefined,
        }),
      );

      const fetchDetail = async () => {
        try {
          const detail = await getUserById(Number(userId));
          dispatch(
            setCredentials({
              user: { id: detail.id, name: detail.name, email: detail.email ?? "" },
              token: storedToken || undefined,
              refreshToken: storedRefreshToken || undefined,
              expiresAt: storedExpiresAt || undefined,
              refreshTokenExpiresAt: storedRefreshExpiresAt || undefined,
            }),
          );
          localStorage.setItem(
            USER_INFO_KEY,
            JSON.stringify({
              name: detail.name,
              email: detail.email ?? "",
            }),
          );
        } catch {
          // keep cached data if fetch fails
        }
      };
      fetchDetail();
    }
    // Keep the 1-minute access token fresh while the tab is open (API doc §2).
    scheduleProactiveRefresh();
    setHydrated(true);
  }, [dispatch]);

  const handleLogin = (
    userData: { id: number; name: string; email: string },
    authToken?: string,
    refreshToken?: string,
    expiresAt?: string,
    refreshTokenExpiresAt?: string,
  ) => {
    localStorage.setItem(USER_ID_KEY, String(userData.id));
    localStorage.setItem(
      USER_INFO_KEY,
      JSON.stringify({
        name: userData.name,
        email: userData.email,
      }),
    );
    if (authToken) {
      localStorage.setItem(TOKEN_KEY, authToken);
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (expiresAt) {
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
    }
    if (refreshTokenExpiresAt) {
      localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, refreshTokenExpiresAt);
    }
    dispatch(
      setCredentials({
        user: userData,
        token: authToken,
        refreshToken,
        expiresAt,
        refreshTokenExpiresAt,
      }),
    );
    scheduleProactiveRefresh();
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    // Call revoke endpoint if refresh token exists
    if (refreshToken) {
      try {
        const axios = (await import("axios")).default;
        const { env } = await import("@/config/env");
        await axios.post(`${env.NEXT_PUBLIC_API_URL}/Auth/revoke-refresh-token`, {
          token: refreshToken,
        });
      } catch (error) {
        console.error("Logout request failed:", error);
      }
    }

    // Clear all tokens and user data
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
    localStorage.removeItem(REFRESH_TOKEN_EXPIRES_AT_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    dispatch(logout());
    // Drop the device push token so this browser stops receiving the
    // previous user's pushes (best-effort — never blocks logout).
    try {
      const { deleteFcmToken } = await import("@/lib/fcm");
      await deleteFcmToken();
    } catch (error) {
      console.error("FCM token deletion failed:", error);
    }
    // Wipe conversation/message caches so a later login (possibly as a
    // different user) never sees the previous session's chat state.
    dispatch(resetChat());
    // Wipe map/position state for the same reason.
    dispatch(resetLocation());
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        hydrated,
        user,
        token,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
