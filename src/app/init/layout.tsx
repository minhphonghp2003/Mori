import type { Metadata } from "next";

const SITE_NAME = "Mori";
// Set NEXT_PUBLIC_SITE_URL in production so canonical and Open Graph URLs use
// the public domain; Vercel previews fall back to VERCEL_URL.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const TITLE = "Mori — Tìm bạn gần đây, kết bạn quanh đây";
const DESCRIPTION =
  "Mori giúp bạn tìm bạn gần đây, kết bạn quanh đây và làm quen với người ở gần. Tìm bạn bè mới, bạn đồng hành du lịch, người cùng sở thích để trò chuyện mỗi ngày.";
const CANONICAL = `${SITE_URL}/init`;
const OG_IMAGE = `${SITE_URL}/screenshot-wide.png`;

/**
 * The /init route is the public entry point. These keywords cover the
 * Vietnamese friend-finding, nearby-friends, travel-buddy and interest
 * clusters. Only this route receives the keyword metadata; no new public
 * routes were added.
 */
const KEYWORDS = [
  // Nearby friends
  "tìm quanh đây",
  "tìm bạn gần đây",
  "tìm bạn gần tôi",
  "tìm bạn quanh đây",
  "tìm bạn bè gần đây",
  "kết bạn gần đây",
  "kết bạn quanh đây",
  "tìm người gần tôi",
  "tìm người ở gần tôi",
  "tìm người gần đây để trò chuyện",
  "tìm bạn cùng khu vực",
  "tìm bạn cùng thành phố",
  "kết nối với người xung quanh",
  "khám phá người gần đây",
  "tìm người cùng sở thích gần tôi",
  "tìm bạn mới gần nơi bạn sống",
  // Finding friends
  "tìm bạn bè",
  "tìm bạn mới",
  "tìm bạn online",
  "kết bạn online",
  "kết bạn bốn phương",
  "kết bạn với người lạ",
  "làm quen bạn mới",
  "tìm người trò chuyện",
  "tìm bạn nói chuyện",
  "tìm bạn tâm sự",
  "mạng xã hội kết bạn",
  "ứng dụng kết bạn",
  "website tìm bạn bè",
  "tìm bạn không cần hẹn hò",
  "tìm người cùng sở thích",
  "kết nối bạn bè",
  "tìm cộng đồng mới",
  "tìm bạn để giao lưu",
  // Travel buddies
  "tìm bạn đi du lịch",
  "tìm người đi du lịch cùng",
  "tìm bạn đồng hành du lịch",
  "tìm bạn đồng hành",
  "tìm bạn đi phượt",
  "tìm bạn đi trekking",
  "tìm bạn đi camping",
  "tìm nhóm đi du lịch",
  "tìm người đi chơi cùng",
  "tìm bạn đi chơi cùng",
  "tìm bạn đi cà phê",
  "tìm bạn đi concert",
  "tìm bạn khám phá thành phố",
  "tìm người cùng khám phá",
  "tìm bạn đi du lịch một mình",
  "tìm bạn đi du lịch bụi",
  "tìm người đồng hành trong chuyến đi",
  "tìm bạn cùng sở thích du lịch",
  // Interests and activities
  "tìm bạn chơi thể thao",
  "tìm bạn chạy bộ",
  "tìm bạn chơi cầu lông",
  "tìm bạn tập gym",
  "tìm bạn học cùng",
  "tìm bạn học tiếng Anh",
  "tìm bạn học lập trình",
  "tìm bạn đi ăn",
  "tìm bạn đi xem phim",
  "tìm bạn đi chơi cuối tuần",
  "tìm người có cùng sở thích",
  "tìm bạn chung sở thích",
  "tìm nhóm bạn mới",
  "kết nối cộng đồng địa phương",
  // Informational
  "cách tìm bạn mới",
  "cách kết bạn với người lạ",
  "cách tìm bạn khi chuyển đến thành phố mới",
  "cách tìm bạn đồng hành du lịch",
  "kinh nghiệm tìm bạn đi phượt",
  "cách tìm người có cùng sở thích",
  "hoạt động giúp làm quen bạn mới",
  "cách tìm bạn đi chơi cùng",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "social networking",
  alternates: {
    canonical: CANONICAL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: CANONICAL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1920,
        height: 1080,
        alt: "Mori — tìm bạn gần đây và kết bạn quanh đây",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  other: {
    "geo.region": "VN",
    "geo.placename": "Việt Nam",
  },
};

export default function InitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
