"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface SectionData {
  rect: DOMRect;
  title: string;
}

interface FilterChaosOverlayProps {
  sections: SectionData[];
  onComplete: () => void;
}

export function FilterChaosOverlay({
  sections,
  onComplete,
}: FilterChaosOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const doneCount = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleDone = () => {
    doneCount.current += 1;
    if (doneCount.current >= sections.length) {
      onComplete();
    }
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[200]">
      {sections.map((section, i) => (
        <motion.div
          key={i}
          initial={{ rotate: 0 }}
          animate={{ rotate: 1800 }}
          transition={{ delay: i * 0.05, duration: 0.8, ease: "easeInOut" }}
          onAnimationComplete={handleDone}
          style={{
            position: "fixed",
            left: section.rect.left,
            top: section.rect.top,
            width: section.rect.width,
            height: section.rect.height,
          }}
          className="flex items-center rounded-xl border border-border bg-card px-4 shadow-lg overflow-hidden"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </span>
        </motion.div>
      ))}
    </div>,
    document.body,
  );
}
