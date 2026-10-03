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
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  "bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
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
