import React from "react";

interface LogoLoaderProps {
  size?: "sm" | "md" | "lg";
  /** Caption under the logo (defaults to "Đang tải..."). Pass null to hide. */
  text?: string | null;
  /** Full-screen centered takeover (for route loading states). */
  fullscreen?: boolean;
}

const SIZES = {
  sm: "w-12 h-12 rounded-2xl",
  md: "w-20 h-20 rounded-[26px]",
  lg: "w-28 h-28 rounded-[32px]",
} as const;

/**
 * Branded loading animation: the Mori logo breathing inside expanding
 * radar rings, with bouncing dots + shimmer bar underneath.
 */
export const LogoLoader: React.FC<LogoLoaderProps> = ({
  size = "md",
  text = "Đang tải...",
  fullscreen = false,
}) => {
  const body = (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="relative flex items-center justify-center">
        {/* Expanding radar rings */}
        <span
          className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping"
          aria-hidden
        />
        <span
          className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping"
          style={{ animationDelay: "0.6s" }}
          aria-hidden
        />
        {/* Breathing logo */}
        <img
          src="/images/logo.webp"
          alt="Mori"
          className={`${SIZES[size]} object-cover shadow-xl shadow-teal-900/20 ring-4 ring-white/60 animate-pulse relative`}
          style={{ animationDuration: "1.6s" }}
        />
      </div>

      {text != null && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span>{text}</span>
            <span className="flex gap-0.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-teal-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          </div>
          {/* Shimmer progress bar */}
          <div className="w-28 h-1 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-400 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );

  if (!fullscreen) return body;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 p-6">
      {body}
    </div>
  );
};
