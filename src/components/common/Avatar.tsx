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
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-100",
  "bg-sky-100 text-sky-800 dark:bg-sky-500/25 dark:text-sky-100",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-100",
  "bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-100",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/25 dark:text-indigo-100",
  "bg-teal-100 text-teal-800 dark:bg-teal-500/25 dark:text-teal-100",
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
