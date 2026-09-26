import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MoriDev",
    short_name: "Mori",
    description:
      "Gần nhau hơn. Gặp gỡ xung quanh. Trò chuyện ngay — mạng xã hội chia sẻ vị trí thời gian thực, khoảnh khắc và hành trình.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    lang: "vi",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/maskable-icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Bản đồ", url: "/location" },
      { name: "Khoảnh khắc", url: "/moments" },
      { name: "Nhắn tin", url: "/chat" },
    ],
  };
}
