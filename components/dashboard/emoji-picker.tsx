"use client";

import { useState, useRef } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useClickOutside } from "@/hooks/use-click-outside";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const { resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-secondary text-4xl transition-all hover:border-primary/30 hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Select emoji"
      >
        {value || "?"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-full z-50 mt-2"
          >
            <div className="overflow-hidden rounded-xl border border-border shadow-xl">
              <Picker
                data={data}
                onEmojiSelect={(emoji: { native: string }) => {
                  onChange(emoji.native);
                  setOpen(false);
                }}
                theme={resolvedTheme === "dark" ? "dark" : "light"}
                set="native"
                skinTonePosition="search"
                previewPosition="none"
                maxFrequentRows={2}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
