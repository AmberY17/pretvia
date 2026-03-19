"use client";

import { useState, useRef } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

const SPORT_EMOJIS = [
  "🏃","🚴","🏊","🤸","🏋️","⚽","🏀","🎾","🏈","⚾",
  "🥊","🤾","🏌️","🎿","🏒","🥋","🏄","🎯","🏆","🎽",
  "👟","💪","🔥","⚡","🌟","🎊",
];

function randomEmoji(): string {
  return SPORT_EMOJIS[Math.floor(Math.random() * SPORT_EMOJIS.length)];
}

interface SlotMachineEmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function SlotMachineEmojiPicker({ value, onChange }: SlotMachineEmojiPickerProps) {
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState(value || "🎰");
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controls = useAnimation();

  const handleClick = () => {
    if (!spinning) {
      setSpinning(true);
      intervalRef.current = setInterval(() => {
        setDisplay(randomEmoji());
        setTick((t) => t + 1);
      }, 120);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setSpinning(false);
      setDisplay((current) => {
        onChange(current);
        return current;
      });
      controls.start({
        scale: [1, 1.25, 0.9, 1.05, 1],
        transition: { duration: 0.4 },
      });
    }
  };

  return (
    <motion.button
      animate={controls}
      onClick={handleClick}
      className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary text-4xl"
      aria-label={spinning ? "Stop" : "Spin"}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={tick}
          initial={spinning ? { y: "-100%", opacity: 0 } : false}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.09, ease: "easeIn" }}
          className="leading-none"
        >
          {display}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
