import type { SVGProps } from "react";

/**
 * Zalo brand mark (blue rounded square + wordmark). Lucide has no brand icons,
 * so this stays a tiny standalone SVG.
 */
export function ZaloIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="#0068FF" />
      <text
        x="12"
        y="15.7"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="8.2"
        fontWeight="700"
        letterSpacing="-0.3"
        fill="#ffffff"
      >
        Zalo
      </text>
    </svg>
  );
}
