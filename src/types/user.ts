export interface ImageDto {
  originalUrl: string;
  thumbUrl: string;
}

export interface FriendshipStatusDto {
  friendshipId: number;
  status: string | number;
  type?: string | number;
  type1?: string | number;
  type2?: string | number;
  requestedById: number;
  blockedById?: number | null;
}

export interface User {
  id: number;
  name: string;
  images: ImageDto[] | null;
  email: string;
  age: number;
  genderId: number;
  friendship?: FriendshipStatusDto | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  age: number;
  genderId: number;
}

export interface UpdateUserInput {
  name?: string;
  age?: number;
  genderId?: number;
}

/**
 * GET /api/user item — full roster (online + offline), no visibility
 * filtering. Location/distance fields are null when never shared.
 */
export interface UserListItemDto {
  userId: number;
  name: string;
  genderId: number;
  image: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  battery: number | null;
  status: string | null;
  updatedAt: string | null;
  distance: number | null;
  isOnline: boolean;
}
