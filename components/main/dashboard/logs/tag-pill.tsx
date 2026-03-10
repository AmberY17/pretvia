"use client";

interface TagPillProps {
  tag: string;
  size?: "sm" | "md";
}

export function TagPill({ tag, size = "sm" }: TagPillProps) {
  return (
    <span
      className={`inline-flex rounded-full bg-primary/10 font-medium text-primary ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs"
      }`}
    >
      {tag}
    </span>
  );
}
