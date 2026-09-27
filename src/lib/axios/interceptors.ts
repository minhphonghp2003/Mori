import { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import axios from "axios";
import { store } from "@/store";
import { logout, setCredentials } from "@/store/slices/auth-slice";
import { emitToast } from "@/lib/toast";
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  REFRESH_TOKEN_EXPIRES_AT_KEY,
  USER_ID_KEY,
  USER_INFO_KEY,
} from "@/constants";
import { env } from "@/config/env";
import { handleApiError } from "./error-handler";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Caller renders its own error UI — suppress the global error toast. */
    silent?: boolean;
  }
  interface InternalAxiosRequestConfig {
    /** Caller renders its own error UI — suppress the global toast. */
    silent?: boolean;
    _retry?: boolean;
    _lockRetries?: number;
    _offlineQueued?: boolean;
  }
}

const RATE_LIMIT_MESSAGE = "Quá nhiều yêu cầu. Vui lòng thử lại sau ít giây.";
const LOCK_CONFLICT_SNIPPET = "Không thể giành";
const MAX_LOCK_RETRIES = 2;
const LOCK_RETRY_DELAYS_MS = [600, 1600];
const PROACTIVE_MARGIN_MS = 15_000;
const PROACTIVE_MIN_DELAY_MS = 1_000;
const PROACTIVE_BACKOFF_BASE_MS = 30_000;
const PROACTIVE_BACKOFF_MAX_MS = 300_000;
const REFRESH_TIMEOUT_MS = 15_000;

/** Single-flight refresh: while a refresh is in flight, 401'd requests wait
 *  here and are replayed with the new token once it resolves. */
let refreshPromise: Promise<string> | null = null;

/** Proactive refresh (1-minute JWT per API doc §2). */
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;
let proactiveFailures = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Rate limiter rejection: HTTP 200 with a zero-length body (API doc §17). */
const isRateLimitedBody = (data: unknown): boolean => data === "" || data === undefined;

const makeRateLimitError = (
  config?: InternalAxiosRequestConfig,
  response?: AxiosResponse,
): AxiosError => new AxiosError(RATE_LIMIT_MESSAGE, "ERR_RATE_LIMITED", config, null, response);

/** Credential endpoints return 401 for "wrong password" — never refresh or
 *  force-logout on those; the form renders the inline error. */
const isCredentialEndpoint = (url?: string): boolean =>
  /\/auth\/(login|register)(\?|$)/i.test(url ?? "");

function clearAllTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(REFRESH_TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  store.dispatch(logout());
}

function forceLogout(): void {
  clearAllTokens();
  if (typeof window !== "undefined") window.location.replace("/init");
}

/** Parse an expiresAt value (ISO8601 or epoch seconds/ms) into a timestamp. */
function parseExpiry(value: string): number | null {
  if (/^\d+$/.test(value)) {
    const n = Number(value);
    return n < 1e12 ? n * 1000 : n;
  }
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/** Refresh shortly before the access token expires (API doc §2). Re-schedules
 *  itself after every run; failed attempts back off exponentially so a
 *  rate-limited refresh can never hammer the endpoint. */
export function scheduleProactiveRefresh(): void {
  if (typeof window === "undefined") return;
  if (proactiveTimer !== null) clearTimeout(proactiveTimer);

  const expiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
  if (!expiresAt || !localStorage.getItem(REFRESH_TOKEN_KEY)) return;

  const expiry = parseExpiry(expiresAt);
  if (expiry === null) return;

  let delay = Math.max(expiry - Date.now() - PROACTIVE_MARGIN_MS, PROACTIVE_MIN_DELAY_MS);
  if (proactiveFailures > 0) {
    delay = Math.max(
      delay,
      Math.min(PROACTIVE_BACKOFF_BASE_MS * proactiveFailures, PROACTIVE_BACKOFF_MAX_MS),
    );
  }
  // setTimeout overflows above 2^31-1 ms (~24.8 days)
  delay = Math.min(delay, 2_147_483_647);

  proactiveTimer = setTimeout(() => {
    proactiveTimer = null;
    getValidToken()
      .then(() => {
        proactiveFailures = 0;
      })
      .catch(() => {
        // Offline / rate-limited / revoked — the reactive 401 path covers the
        // next real request, so stay quiet here.
        proactiveFailures += 1;
      })
      .finally(() => scheduleProactiveRefresh());
  }, delay);
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error("No refresh token available");

  // Raw axios call — must NOT go through the intercepted instance
  let response: AxiosResponse;
  try {
    response = await axios.post(
      `${env.NEXT_PUBLIC_API_URL}/Auth/refresh`,
      {
        token: refreshToken,
        deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 256) : undefined,
      },
      { timeout: REFRESH_TIMEOUT_MS },
    );
  } catch (err) {
    if (err instanceof AxiosError && err.code === "ERR_RATE_LIMITED") throw err;
    throw new Error("Refresh request failed");
  }

  // The auth rate limiter answers 200 with an empty body — never treat that
  // as a successful refresh (silent logout otherwise, API doc §17).
  if (isRateLimitedBody(response.data)) throw makeRateLimitError(response.config, response);

  const payload = response.data?.data ?? response.data;
  const newAccessToken: string | undefined = payload?.token ?? payload?.accessToken;
  if (!newAccessToken) throw new Error("Invalid refresh response");

  const newRefreshToken: string | undefined = payload?.refreshToken;
  const expiresAt: string | undefined = payload?.expiresAt;
  const refreshTokenExpiresAt: string | undefined = payload?.refreshTokenExpiresAt;

  try {
    localStorage.setItem(TOKEN_KEY, newAccessToken);
    if (newRefreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    if (expiresAt) localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
    if (refreshTokenExpiresAt) localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, refreshTokenExpiresAt);
  } catch {
    throw new Error("Failed to persist tokens");
  }

  const state = store.getState().auth;
  if (state.user) {
    store.dispatch(
      setCredentials({
        user: state.user,
        token: newAccessToken,
        refreshToken: newRefreshToken ?? state.refreshToken ?? undefined,
        expiresAt: expiresAt ?? state.expiresAt ?? undefined,
        refreshTokenExpiresAt: refreshTokenExpiresAt ?? state.refreshTokenExpiresAt ?? undefined,
      }),
    );
  }

  // The hub reads the access token fresh from localStorage on every
  // (re)connect, so the live connection survives rotation untouched — no
  // forced restart that would drop conversation subscriptions. Announce the
  // rotation for listeners that care (e.g. location re-sync).
  window.dispatchEvent(new Event("signalr:token-refreshed"));
  scheduleProactiveRefresh();

  return newAccessToken;
}

/** Get a valid token: single-flight — concurrent callers share one refresh. */
function getValidToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export const setupRequestInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });
};

export const setupResponseInterceptor = (instance: AxiosInstance): void => {
  // Link 1 — success-path checks (rate-limited = HTTP 200 + empty body, API
  // doc §17). Registered as its own interceptor so the rejection thrown here
  // is caught by the error handler in the next link (a single
  // use(onFulfilled, onRejected) pair would skip its own onFulfilled errors).
  instance.interceptors.response.use((response: AxiosResponse) => {
    if (
      response.status === 200 &&
      (response.config.responseType === undefined ||
        response.config.responseType === "json" ||
        response.config.responseType === "text") &&
      isRateLimitedBody(response.data)
    ) {
      throw makeRateLimitError(response.config, response);
    }
    return response;
  });

  // Link 2 — error handling for upstream failures AND link-1 rejections.
  instance.interceptors.response.use(
    undefined,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig | undefined;

      if (error.code === "ERR_RATE_LIMITED") {
        if (!originalRequest?.silent) emitToast(RATE_LIMIT_MESSAGE, "error");
        return Promise.reject(error);
      }

      // A mutation queued while offline — inform without a scary error toast;
      // the request will sync automatically.
      if (originalRequest?._offlineQueued || error.code === "ERR_OFFLINE_QUEUED") {
        emitToast("Bạn đang ngoại tuyến — thao tác sẽ tự động đồng bộ.", "info");
        return Promise.reject(error);
      }

      // Network failure while offline (no cached GET available): the offline
      // banner already communicates the state, so skip the toast.
      if (error.code === "ERR_NETWORK" && typeof navigator !== "undefined" && !navigator.onLine) {
        return Promise.reject(error);
      }

      const status = error.response?.status;

      // 401 → single-flight refresh → replay the original request once.
      if (
        status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !isCredentialEndpoint(originalRequest.url)
      ) {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          originalRequest._retry = true;
          try {
            const newToken = await getValidToken();
            if (originalRequest.headers && newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return instance(originalRequest);
          } catch (refreshError) {
            // Refresh failed (revoked / rate-limited / network) — end the
            // session cleanly. No loop: navigation leaves the failing page.
            forceLogout();
            return Promise.reject(refreshError);
          }
        }
        // Had a request but no refresh token — session is over.
        forceLogout();
        return Promise.reject(error);
      }

      // 409 distributed-lock contention → retry with backoff (API doc §17).
      if (status === 409 && originalRequest) {
        const serverMessage = (error.response?.data as { message?: string } | undefined)?.message;
        const attempt = originalRequest._lockRetries ?? 0;
        if (
          serverMessage?.includes(LOCK_CONFLICT_SNIPPET) &&
          attempt < MAX_LOCK_RETRIES
        ) {
          originalRequest._lockRetries = attempt + 1;
          await sleep(LOCK_RETRY_DELAYS_MS[attempt]);
          return instance(originalRequest);
        }
      }

      // Everything else: surface a localised message unless the caller opted out.
      // 404 is never toasted — missing resources have dedicated not-found UI
      // (detail pages, profile grids) and background refetches of deleted
      // items must not nag.
      // 401 on credential endpoints falls through here too — the form shows it.
      if (!originalRequest?.silent && error.response?.status !== 404) {
        emitToast(handleApiError(error).message, "error");
      }

      return Promise.reject(error);
    },
  );
};
