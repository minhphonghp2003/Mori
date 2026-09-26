import type { VisibilityTier } from "@/types";

export interface VisibilityOption {
  value: VisibilityTier;
  label: string;
  desc: string;
  icon: string;
}

/** Location-visibility choices shared by settings, map and moments. */
export const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 0, label: "Chỉ mình tôi", desc: "Ẩn hoàn toàn vị trí khỏi bản đồ", icon: "Lock" },
  { value: 1, label: "Bạn bè", desc: "Chỉ bạn bè trong danh bạ mới nhìn thấy", icon: "Users" },
  { value: 2, label: "Bạn thân", desc: "Chỉ danh sách Bạn thân xem được", icon: "Star" },
  { value: 3, label: "Người yêu", desc: "Chỉ chia sẻ riêng cho đối phương", icon: "Heart" },
  { value: 4, label: "Công khai", desc: "Mọi người quanh khu vực đều thấy", icon: "Globe" },
];
