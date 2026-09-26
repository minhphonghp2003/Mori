import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AuthResponse, LoginInput, RegisterInput } from "@/types/auth";

/** Auth endpoints render their own inline errors (and wrong-password is a
 *  401) — keep the global error toast out of these flows. */

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const { data } = await httpClient.post<ApiResponse<AuthResponse>>("/Auth/login", input, {
    silent: true,
  });
  return data.data;
};

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const { data } = await httpClient.post<ApiResponse<AuthResponse>>("/Auth/register", input, {
    silent: true,
  });
  return data.data;
};

/**
 * PUT /api/Auth/fcm-token — sync the FCM device token for the logged-in
 * user. Call whenever Firebase rotates the token (onTokenRefresh) or after
 * permission is granted post-login. Requires Bearer auth.
 */
export const updateFcmToken = async (fcmToken: string): Promise<void> => {
  await httpClient.put<ApiResponse<null>>("/Auth/fcm-token", { fcmToken });
};

export const logoutApi = async (): Promise<void> => {
  await httpClient.post("/auth/logout", undefined, { silent: true });
};

export const forgotPassword = async (email: string): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/auth/forgot-password", { email }, { silent: true });
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  await httpClient.post<ApiResponse<null>>(
    "/auth/reset-password",
    { token, newPassword },
    { silent: true },
  );
};
