"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { treeFruits } from "@/components/landing/landing-data";

function SubTreeSvg({
  className,
  inView,
}: {
  className?: string;
  inView: boolean;
}) {
  return (
    <svg
      viewBox="0 0 200 250"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        d="M100 250 L100 140 Q100 100 80 80 M100 140 Q100 100 120 80"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        className="text-primary/50"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: inView ? 1 : 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <motion.path
        d="M85 120 Q50 100 30 70 M75 100 Q45 85 25 110 M115 120 Q150 100 170 70 M125 100 Q155 85 175 110"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-primary/40"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: inView ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
      />
    </svg>
  );
}

function FruitWithLabel({
  fruit,
  index,
  inView,
}: {
  fruit: (typeof treeFruits)[0];
  index: number;
  inView: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: inView ? 1 : 0,
        opacity: inView ? 1 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 700,
        damping: 12,
        delay: inView ? 1.2 + index * 0.3 : 0,
      }}
      style={{
        position: "absolute",
        left: `calc(50% + ${fruit.position.x}px)`,
        top: `calc(40% + ${fruit.position.y}px)`,
        x: "-50%",
        y: "-50%",
      }}
      className="flex flex-col items-center gap-2"
    >
      <span className="text-5xl md:text-6xl drop-shadow-lg">{fruit.emoji}</span>
      <span className="whitespace-nowrap rounded-full bg-card/90 px-3 py-1 text-sm font-medium text-foreground shadow-md border border-border">
        {fruit.label}
      </span>
    </motion.div>
  );
}

export function GrowthTreeSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2, once: false });

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden sm:px-6 sm:py-20"
    >
      <div className="relative w-full max-w-4xl">
        {/* Sub-trees — hidden on mobile to avoid clutter; show from sm */}
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5 }}
          className="absolute -left-12 top-1/2 hidden -translate-y-1/2 w-24 h-28 text-primary/40 sm:block md:w-32 md:h-36"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="absolute -left-4 top-1/4 hidden w-20 h-24 text-primary/35 sm:block md:w-24 md:h-28"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="absolute -right-8 top-1/3 hidden w-20 h-24 text-primary/40 sm:block md:w-28 md:h-32"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="absolute -right-2 bottom-1/3 hidden w-14 h-18 text-primary/35 sm:block md:w-20 md:h-24"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="absolute left-1/4 -bottom-4 hidden w-16 h-20 text-primary/30 sm:block md:w-20 md:h-24"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute right-1/4 -top-2 hidden w-20 h-24 text-primary/35 sm:block md:w-24 md:h-28"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="absolute left-[15%] top-1/4 hidden w-16 h-20 text-primary/25 sm:block md:w-20 md:h-24"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>
        <motion.div
          animate={{ opacity: inView ? 1 : 0.5, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="absolute right-[12%] top-1/2 hidden -translate-y-1/2 w-16 h-20 text-primary/30 sm:block md:w-20 md:h-24"
        >
          <SubTreeSvg inView={inView} />
        </motion.div>

        {/* Main tree with fruits — responsive width */}
        <div className="relative mx-auto w-full max-w-[420px] h-[360px] sm:h-[420px] md:h-[480px] md:max-w-[560px] md:h-[640px]">
          <svg
            viewBox="0 0 200 250"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d="M100 250 L100 140 Q100 100 80 80 M100 140 Q100 100 120 80"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-primary/70"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: inView ? 1 : 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            <motion.path
              d="M85 120 Q50 100 30 70 M75 100 Q45 85 25 110"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              className="text-primary/60"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: inView ? 1 : 0 }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            />
            <motion.path
              d="M115 120 Q150 100 170 70 M125 100 Q155 85 175 110"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              className="text-primary/60"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: inView ? 1 : 0 }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            />
            <motion.path
              d="M80 80 Q60 50 50 30 M120 80 Q140 50 150 30 M90 70 Q100 40 100 20 M110 70 Q100 40 100 20"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="text-primary/50"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: inView ? 1 : 0 }}
              transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
            />
          </svg>

          {treeFruits.map((fruit, i) => (
            <FruitWithLabel
              key={fruit.label}
              fruit={fruit}
              index={i}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
