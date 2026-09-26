import type { Timeline } from "@/types";
import type { TimelineDto } from "@/types/timeline";
import type { MomentDto } from "@/types/moment";
import { mapMoment } from "@/lib/moment/mappers";

export const TIMELINE_BANNER_FALLBACK =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";

const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#e2e8f0"/><text x="48" y="60" font-size="40" font-family="sans-serif" fill="#94a3b8" text-anchor="middle">?</text></svg>',
  );

/** Owner/partner lookup so mapped rows get real names + avatars. */
export interface TimelineOwnerLookup {
  myId: string;
  findUser: (id: string) => { name: string; avatar: string } | undefined;
}

const formatShortDate = (value: string | number | Date): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/**
 * API `TimelineDto` + its moments -> the design-shaped `Timeline`.
 * API adaptation (plan table): caption only (title), description dropped,
 * dates derived from moments, banner = first moment image, journey stops
 * derived from the moment list (dayNumber = stop order, newest-first page
 * is reversed so the journey reads chronologically).
 */
export const buildTimelineView = (
  dto: TimelineDto,
  momentDtos: MomentDto[],
  ctx: TimelineOwnerLookup,
): Timeline => {
  const ownerId = String(dto.ownerId);
  const owner =
    ownerId === ctx.myId ? ctx.findUser(ctx.myId) : ctx.findUser(ownerId);
  const moments = momentDtos.map(mapMoment);
  const times = momentDtos
    .map((m) => new Date(m.createdAt).getTime())
    .filter((t) => !Number.isNaN(t));
  const created = formatShortDate(dto.createdAt);
  const startDate = times.length
    ? formatShortDate(new Date(Math.min(...times)).getTime())
    : created;
  const endDate = times.length
    ? formatShortDate(new Date(Math.max(...times)).getTime())
    : created;
  const banner =
    moments.find((m) => !!m.imageUrl)?.imageUrl ?? TIMELINE_BANNER_FALLBACK;

  // API pages are newest-first; the journey line should read start -> finish.
  const ordered = [...moments].reverse();

  return {
    id: String(dto.id),
    title: dto.caption?.trim() || "Hành trình không tên",
    description: "",
    bannerImage: banner,
    startDate,
    endDate,
    ownerId,
    ownerName: owner?.name ?? "Người dùng",
    ownerAvatar: owner?.avatar || FALLBACK_AVATAR,
    momentCount: dto.momentCount ?? momentDtos.length,
    partners: dto.partners.map((p) => ({
      id: String(p.userId),
      name: p.userName,
      avatar: p.userImage?.thumbUrl || FALLBACK_AVATAR,
    })),
    moments: ordered.map((m, idx) => ({
      id: m.id,
      title: m.locationName || "Khoảnh khắc",
      caption: m.caption,
      imageUrl: m.imageUrl,
      locationName: m.locationName || "",
      time: m.timeAgo,
      dayNumber: idx + 1,
      moment: m,
    })),
  };
};
