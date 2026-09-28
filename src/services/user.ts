import { httpClient } from "@/lib/axios";
import type { ApiResponse, CursorPageResponse } from "@/types/api";
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
export const getAllUsers = async (params?: {
  prevId?: number | null;
  take?: number;
  genderId?: number | null;
}): Promise<CursorPageResponse<UserListItemDto>> => {
  const { data } = await httpClient.get<CursorPageResponse<UserListItemDto>>("/User", {
    params: {
      prevId: params?.prevId ?? undefined,
      take: params?.take ?? 100,
      genderId: params?.genderId ?? undefined,
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
