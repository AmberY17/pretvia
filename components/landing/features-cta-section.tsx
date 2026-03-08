"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FeaturesCtaSection() {
  return (
    <section className="border-t border-border px-6 py-24">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex justify-center"
      >
        <Link href="/auth">
          <Button
            size="lg"
            className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90"
          >
            Get started for free
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}
