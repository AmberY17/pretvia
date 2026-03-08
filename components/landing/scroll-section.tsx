"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ScrollSectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function ScrollSection({ children, className = "", id }: ScrollSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [60, 0, 0, -60]);

  return (
    <motion.section
      ref={ref}
      id={id}
      style={{ opacity, y }}
      className={`min-h-screen flex items-center justify-center px-6 py-20 ${className}`}
    >
      {children}
    </motion.section>
  );
}

interface StickyScrollSectionProps {
  children: ReactNode;
  className?: string;
  height?: string;
}

export function StickyScrollSection({
  children,
  className = "",
  height = "200vh",
}: StickyScrollSectionProps) {
  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="sticky top-0 flex min-h-screen items-center justify-center">
        {children}
      </div>
    </div>
  );
}

interface ParallaxWrapperProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export function ParallaxWrapper({ children, speed = 0.5, className = "" }: ParallaxWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100 * speed, -100 * speed]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
