"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2, once: false });

  return (
    <section ref={ref} className="px-4 py-12 sm:px-6 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 30 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-xl text-center"
      >
        <Link href="/auth">
          <Button
            size="lg"
            className="gap-2 bg-primary px-10 py-6 text-lg text-primary-foreground hover:bg-primary/90"
          >
            Get started for free
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}
