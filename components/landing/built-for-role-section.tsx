"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { RoleCards } from "@/components/landing/role-cards";

export function BuiltForRoleSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.1, once: false });

  return (
    <section ref={ref} className="relative px-4 py-12 sm:px-6 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: inView ? 1 : 0,
          y: inView ? 0 : 20,
        }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-5xl"
      >
        <h2 className="mb-2 text-center text-3xl font-bold text-foreground md:text-4xl">
          Built for every role
        </h2>
        <p className="mb-12 text-center text-lg text-muted-foreground">
          Whether you coach, train, or support from the sidelines.
        </p>
        <RoleCards />
      </motion.div>
    </section>
  );
}
