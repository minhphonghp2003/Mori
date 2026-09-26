import type { Moment, MomentReaction, ReactionEmoji, VisibilityTier } from "@/types";
import type { MomentDto } from "@/types/moment";
import { MOMENT_VISIBILITY_VALUES } from "@/types/moment";

const REACTION_EMOJIS: readonly string[] = ["❤️", "👍", "😂", "😮", "😢", "😡"];

export const toReactionEmoji = (emoji: string): ReactionEmoji =>
  (REACTION_EMOJIS.includes(emoji) ? emoji : "❤️") as ReactionEmoji;

/** Vietnamese relative time for the reel overlay ("Vừa xong", "15 phút trước"...). */
export const formatMomentTimeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Hôm qua";
  if (diffDay < 7) return `${diffDay} ngày trước`;
  const d = new Date(then);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** MomentDto -> the design-shaped `Moment` used by the reel/viewer/cards. */
export const mapMoment = (dto: MomentDto): Moment => {
  const isVideo = !!dto.video;
  const imageUrls = dto.images.map((i) => i.originalUrl);
  const reactions: MomentReaction[] = dto.reactions.map((r) => ({
    userId: String(r.userId),
    userName: "",
    userAvatar: "",
    emoji: toReactionEmoji(r.emoji),
  }));

  return {
    id: String(dto.id),
    userId: String(dto.userId),
    userName: dto.userName,
    userAvatar: dto.userImage?.thumbUrl ?? "",
    imageUrl: isVideo
      ? dto.video!.thumbUrl || dto.video!.originalUrl
      : (dto.images[0]?.thumbUrl ?? ""),
    imageUrls: !isVideo && imageUrls.length > 0 ? imageUrls : undefined,
    mediaType: isVideo ? "video" : "image",
    videoUrl: isVideo ? dto.video!.originalUrl : undefined,
    caption: dto.caption ?? "",
    locationName: dto.location?.isShowed ? (dto.location.placeName ?? undefined) : undefined,
    includeLocation: !!dto.location?.isShowed,
    timeAgo: formatMomentTimeAgo(dto.createdAt),
    createdAt: dto.createdAt,
    visibility: MOMENT_VISIBILITY_VALUES[dto.visibility] as VisibilityTier,
    allowComment: dto.allowComment,
    reactions,
    timelineId: dto.timelineId != null ? String(dto.timelineId) : undefined,
  };
};
