import { httpClient } from "@/lib/axios";
import type { ApiResponse, CursorPageResponse } from "@/types/api";
import type { CreateTimelineInput, TimelineDto } from "@/types/timeline";
import type { MomentDto } from "@/types/moment";
import { getTimelineMoments } from "@/services/moment";

export async function getTimelineById(id: number): Promise<ApiResponse<TimelineDto>> {
  const { data } = await httpClient.get<ApiResponse<TimelineDto>>(`/Timeline/${id}`);
  return data;
}

export async function getMyTimelines(
  prevId?: number | null,
  take = 10,
): Promise<CursorPageResponse<TimelineDto>> {
  const { data } = await httpClient.get<CursorPageResponse<TimelineDto>>("/Timeline/me", {
    params: { prevId: prevId ?? undefined, take },
  });
  return data;
}

export async function getUserTimelines(
  userId: number,
  prevId?: number | null,
  take = 10,
): Promise<CursorPageResponse<TimelineDto>> {
  const { data } = await httpClient.get<CursorPageResponse<TimelineDto>>(
    `/Timeline/user/${userId}`,
    {
      params: { prevId: prevId ?? undefined, take },
    },
  );
  return data;
}

export async function createTimeline(input: CreateTimelineInput): Promise<TimelineDto> {
  const { data } = await httpClient.post<ApiResponse<TimelineDto>>("/Timeline", input);
  return data.data;
}

export async function deleteTimeline(id: number): Promise<void> {
  await httpClient.delete(`/Timeline/${id}`);
}

/** All moments of a timeline (cursor loop, capped) for detail/list views. */
export async function getTimelineMomentsAll(
  timelineId: number,
  pageSize = 30,
  maxItems = 200,
): Promise<MomentDto[]> {
  const out: MomentDto[] = [];
  let prevId: number | null = null;
  for (let page = 0; page < Math.ceil(maxItems / pageSize); page++) {
    const res = await getTimelineMoments(timelineId, prevId, pageSize);
    out.push(...res.data);
    if (!res.hasMore || res.prevId == null) break;
    prevId = res.prevId;
  }
  return out.slice(0, maxItems);
}
