import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  /** White spinner for dark/black surfaces (replaces the indigo default). */
  light?: boolean;
}

const SIZES = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
} as const;

/** Small inline loading spinner (for overlays/tight rows — full screens use LogoLoader). */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  className = "",
  light = false,
}) => (
  <span
    role="status"
    aria-label="Đang tải"
    className={`inline-flex items-center justify-center ${
      light ? "text-white" : "text-indigo-600 dark:text-indigo-400"
    } ${className}`}
  >
    <Loader2 className={`${SIZES[size]} animate-spin`} />
  </span>
);
