import React from "react";

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  /** Text size for the initial fallback (defaults to text-xs). */
  textClassName?: string;
  title?: string;
}

const FALLBACK_BG = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
];

/**
 * User/group avatar with a first-letter fallback when there is no image
 * ("" src makes browsers re-download the page — never render it).
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = "",
  className = "",
  textClassName = "text-xs",
  title,
}) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        title={title ?? (name || undefined)}
        referrerPolicy="no-referrer"
        className={className}
      />
    );
  }
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const tone = FALLBACK_BG[hash % FALLBACK_BG.length];
  return (
    <div
      className={`flex items-center justify-center font-bold shrink-0 ${tone} ${textClassName} ${className}`}
      title={title ?? (name || undefined)}
      aria-label={name}
    >
      <span>{initial}</span>
    </div>
  );
};
