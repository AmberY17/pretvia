"use client";

import { motion } from "framer-motion";

export function FeaturesHeroSection() {
  return (
    <section className="px-6 pt-32 pb-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl"
      >
        <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Features for{" "}
          <span className="bg-gradient-to-r from-primary to-[hsl(190,80%,50%)] bg-clip-text text-transparent">
            Everyone
          </span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Explore how Pretvia helps coaches, athletes, and guardians work
          together.
        </p>
      </motion.div>
    </section>
  );
}
