"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { DeviceFrame } from "@/components/landing/device-frame";

export function ProductSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: false });

  return (
    <section ref={ref} className="relative px-4 py-12 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl overflow-hidden">
        <motion.div
          initial={{ rotateX: 15, scale: 0.85, opacity: 0 }}
          animate={{
            rotateX: inView ? 0 : 15,
            scale: inView ? 1 : 0.85,
            opacity: inView ? 1 : 0,
          }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="perspective-1000 preserve-3d relative"
        >
          <DeviceFrame
            imageSrc="/screenshots/athlete-dashboard.png"
            imageAlt="Pretvia Dashboard Preview"
            animate={false}
            className="mx-auto w-full max-w-4xl"
          />
        </motion.div>
      </div>
    </section>
  );
}
