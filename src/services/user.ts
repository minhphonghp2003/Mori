import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { User, UserListItemDto, UpdateUserInput } from "@/types/user";

export const getUserById = async (id: number): Promise<User> => {
  const { data } = await httpClient.get<ApiResponse<User>>(`/User/${id}`);
  return data.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const { data } = await httpClient.get<ApiResponse<User>>("/User/me");
  return data.data;
};

/** Full roster (online + offline, caller excluded server-side). */
export interface AllUsersPage {
  data: UserListItemDto[];
  success: boolean;
  message?: string | null;
  /** Opaque shuffle cursor — pass back verbatim, never interpret. */
  prevId: number | null;
  hasMore: boolean;
  /** Shuffle session from page 1 — echo on following pages. */
  seed?: number | null;
}

export const getAllUsers = async (params?: {
  take?: number;
  genderId?: number | null;
  seed?: number | null;
  prevId?: number | null;
}): Promise<AllUsersPage> => {
  const { data } = await httpClient.get<AllUsersPage>("/User", {
    params: {
      take: params?.take ?? 10,
      genderId: params?.genderId ?? undefined,
      seed: params?.seed ?? undefined,
      prevId: params?.prevId ?? undefined,
    },
  });
  return data;
};

export const updateCurrentUser = async (input: UpdateUserInput): Promise<User> => {
  const { data } = await httpClient.put<ApiResponse<User>>("/User/me", input);
  return data.data;
};

export const setAvatar = async (fileId: string): Promise<User> => {
  const { data } = await httpClient.post<ApiResponse<User>>("/User/me/avatar", { fileId });
  return data.data;
};
