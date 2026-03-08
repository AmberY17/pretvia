"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function FinalHookSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: false });

  return (
    <section
      ref={ref}
      className="relative flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6 sm:py-20"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: inView ? 1 : 0.7, scale: inView ? 1 : 0.95 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative text-center"
      >
        <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-foreground pb-2 sm:text-4xl md:text-6xl lg:text-7xl">
          <span className="text-muted-foreground/60">Pretvia:</span>
          <br />
          <span className="relative inline-block overflow-hidden pb-1">
            <span className="bg-gradient-to-r from-primary via-primary to-[hsl(190,80%,50%)] bg-clip-text text-transparent">
              Be ready for your moment.
            </span>
            {/* Shine — sweep left to right when scrolled into view */}
            <motion.span
              className="absolute inset-0 w-2/3 bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/55 pointer-events-none"
              style={{
                transformOrigin: "left",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              initial={{ x: "-100%" }}
              animate={{ x: inView ? "250%" : "-100%" }}
              transition={{
                duration: 1.8,
                ease: [0.2, 0.8, 0.4, 1],
                delay: inView ? 0.2 : 0,
              }}
            />
          </span>
        </h2>
      </motion.div>
    </section>
  );
}
