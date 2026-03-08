"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { FeatureScreenshot } from "@/components/landing/features-data";

export function ScreenshotLightbox({
  screenshot,
  onClose,
}: {
  screenshot: FeatureScreenshot | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {screenshot && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-xl"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-8 items-center gap-1.5 border-b border-border bg-secondary/50 px-3">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-checkin/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
            </div>
            <div className="relative">
              <Image
                src={screenshot.src}
                alt={screenshot.alt}
                width={1280}
                height={720}
                className="h-auto max-h-[calc(85vh-80px)] w-auto object-contain"
              />
            </div>
            <div className="border-t border-border bg-card p-4">
              <p className="font-medium text-foreground">{screenshot.title}</p>
              {screenshot.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {screenshot.description}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
