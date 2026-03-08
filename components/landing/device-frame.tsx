"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

interface DeviceFrameProps {
  children?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
  animate?: boolean;
}

export function DeviceFrame({
  children,
  imageSrc,
  imageAlt = "Product screenshot",
  className = "",
  animate = true,
}: DeviceFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [25, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.85, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  const content = imageSrc ? (
    <Image
      src={imageSrc}
      alt={imageAlt}
      fill
      className="object-cover object-top"
      priority
    />
  ) : (
    children
  );

  if (!animate) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl ${className}`}>
        {/* Browser chrome */}
        <div className="flex h-8 items-center gap-1.5 border-b border-border bg-secondary/50 px-3">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-checkin/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
          <div className="ml-3 flex-1">
            <div className="mx-auto h-4 w-48 max-w-full rounded-md bg-secondary" />
          </div>
        </div>
        {/* Content */}
        <div className="relative aspect-[16/10]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, scale, opacity }}
      className={`perspective-1000 preserve-3d relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl ${className}`}
    >
      {/* Browser chrome */}
      <div className="flex h-8 items-center gap-1.5 border-b border-border bg-secondary/50 px-3">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-checkin/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
        <div className="ml-3 flex-1">
          <div className="mx-auto h-4 w-48 max-w-full rounded-md bg-secondary" />
        </div>
      </div>
      {/* Content */}
      <div className="relative aspect-[16/10]">
        {content}
      </div>
    </motion.div>
  );
}

interface PhoneFrameProps {
  children?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
}

export function PhoneFrame({
  children,
  imageSrc,
  imageAlt = "Mobile screenshot",
  className = "",
}: PhoneFrameProps) {
  const content = imageSrc ? (
    <Image
      src={imageSrc}
      alt={imageAlt}
      fill
      className="object-cover object-top"
    />
  ) : (
    children
  );

  return (
    <div className={`relative overflow-hidden rounded-[2.5rem] border-4 border-foreground/20 bg-card shadow-2xl ${className}`}>
      {/* Notch */}
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-foreground/20" />
      {/* Content */}
      <div className="relative aspect-[9/19]">
        {content}
      </div>
      {/* Home indicator */}
      <div className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-foreground/20" />
    </div>
  );
}
