"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Screenshot {
  src: string;
  alt: string;
  title: string;
  description?: string;
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
  className?: string;
  columns?: 2 | 3 | 4;
}

export function ScreenshotGallery({
  screenshots,
  className = "",
  columns = 3,
}: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  const goNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % screenshots.length);
  };

  const goPrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(
      (selectedIndex - 1 + screenshots.length) % screenshots.length
    );
  };

  return (
    <>
      <div className={`grid gap-4 ${gridCols[columns]} ${className}`}>
        {screenshots.map((screenshot, index) => (
          <motion.button
            key={screenshot.src}
            onClick={() => setSelectedIndex(index)}
            className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary/30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Image
              src={screenshot.src}
              alt={screenshot.alt}
              fill
              className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent p-4 pt-8">
              <p className="font-medium text-foreground">{screenshot.title}</p>
              {screenshot.description && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {screenshot.description}
                </p>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl p-4"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Navigation */}
            {screenshots.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Image */}
            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Browser chrome */}
              <div className="flex h-8 items-center gap-1.5 border-b border-border bg-secondary/50 px-3">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-checkin/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
              </div>
              <div className="relative">
                <Image
                  src={screenshots[selectedIndex].src}
                  alt={screenshots[selectedIndex].alt}
                  width={1280}
                  height={720}
                  className="h-auto max-h-[calc(85vh-80px)] w-auto object-contain"
                />
              </div>
              {/* Caption */}
              <div className="border-t border-border bg-card p-4">
                <p className="font-medium text-foreground">
                  {screenshots[selectedIndex].title}
                </p>
                {screenshots[selectedIndex].description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {screenshots[selectedIndex].description}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Dots indicator */}
            {screenshots.length > 1 && (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                {screenshots.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(i);
                    }}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      i === selectedIndex
                        ? "bg-primary"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
