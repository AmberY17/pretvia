"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";

function extractFirstEmoji(str: string): string | null {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    for (const { segment } of seg.segment(str)) {
      if (/\p{Emoji}/u.test(segment) && !/^[0-9#*]$/.test(segment))
        return segment;
    }
  }
  const m = str.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u);
  return m ? m[0] : null;
}

interface EmojiInputBoxProps {
  emoji: string;
  index: number;
  isEditing: boolean;
  prefersReduced: boolean;
  onStartEdit: (index: number) => void;
  onConfirm: (index: number, emoji: string) => void;
  onDismiss: () => void;
}

export function EmojiInputBox({
  emoji,
  index,
  isEditing,
  prefersReduced,
  onStartEdit,
  onConfirm,
  onDismiss,
}: EmojiInputBoxProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  useClickOutside(popoverRef, isEditing, onDismiss);

  return (
    <div className="relative">
      <motion.button
        className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-border bg-card text-xl shadow-lg sm:h-14 sm:w-14 sm:text-2xl"
        initial={{ opacity: 0, scale: 0 }}
        animate={
          prefersReduced
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: 1, y: [0, -8, 0] }
        }
        transition={
          prefersReduced
            ? { delay: 0.5 + index * 0.1, duration: 0.3 }
            : {
                opacity: { delay: 0.5 + index * 0.1, duration: 0.3 },
                scale: { delay: 0.5 + index * 0.1, duration: 0.3 },
                y: {
                  duration: 3,
                  delay: index * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }
        }
        onClick={() => onStartEdit(index)}
      >
        {emoji}
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary opacity-0 shadow transition-opacity group-hover:opacity-100">
          <Pencil className="h-2.5 w-2.5 text-primary-foreground" />
        </span>
      </motion.button>

      {isEditing && (
        <div
          ref={popoverRef}
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-xl border border-border bg-card p-3 shadow-xl"
        >
          <p className="mb-1.5 text-center text-xs text-muted-foreground">
            Type an emoji
          </p>
          <input
            type="text"
            autoFocus
            className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-center text-xl focus:outline-none focus:ring-2 focus:ring-primary"
            onChange={(e) => {
              const found = extractFirstEmoji(e.target.value);
              if (found) onConfirm(index, found);
            }}
          />
        </div>
      )}
    </div>
  );
}
