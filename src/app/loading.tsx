import { LogoLoader } from "@/components/common/LogoLoader";

/** Global route loading fallback (App Router `loading.tsx` convention). */
export default function Loading() {
  return <LogoLoader size="lg" fullscreen />;
}
