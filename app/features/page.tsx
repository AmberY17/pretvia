"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChartNoAxesCombined,
  X,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  roleSections,
  type FeatureScreenshot,
  type RoleSection,
} from "@/components/landing/features-data";

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState<string>("coach");
  const [lightboxScreenshot, setLightboxScreenshot] =
    useState<FeatureScreenshot | null>(null);
  const activeSection =
    roleSections.find((s) => s.id === activeTab) || roleSections[0];

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Pretvia"
              width={28}
              height={28}
              className="h-7 w-7 object-contain dark:hidden"
            />
            <Image
              src="/logo_dark_white.png"
              alt="Pretvia"
              width={28}
              height={28}
              className="hidden h-7 w-7 object-contain dark:block"
            />
            <span className="font-brand text-lg font-bold uppercase tracking-[0.15em] text-foreground">
              Pretvia
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="sm">
                Home
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="ghost-secondary" size="sm" className="gap-2">
                Sign In
              </Button>
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </nav>

      {/* Hero */}
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

      {/* Role Tabs */}
      <section className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl justify-center gap-2 px-6 py-4">
          {roleSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`relative rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
                activeTab === section.id
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {activeTab === section.id && (
                <motion.div
                  layoutId="active-tab-bg"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">
                {section.title.replace("For ", "")}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Active Section Content */}
      <AnimatePresence mode="wait">
        <motion.section
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="px-6 py-16"
        >
          <div className="mx-auto max-w-6xl">
            {/* Section Header */}
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                {activeSection.title}
              </h2>
              <p className="mt-2 text-lg font-medium text-primary">
                {activeSection.subtitle}
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {activeSection.description}
              </p>
            </div>

            {/* Feature cards — elongated, alternating left/right */}
            <div className="space-y-12 md:space-y-20">
              {activeSection.features.map((feature, i) => {
                const alignRight = feature.screenshot && i % 2 === 1;
                return (
                  <motion.article
                    key={feature.title}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex flex-col gap-8 md:flex-row md:items-center md:gap-12 ${
                      alignRight ? "md:flex-row-reverse" : ""
                    } ${!feature.screenshot ? "md:max-w-2xl" : ""}`}
                  >
                    <div
                      className={`flex-1 ${feature.screenshot ? "md:flex-[1.2]" : ""} ${
                        alignRight ? "md:text-right" : ""
                      }`}
                    >
                      <div
                        className={`mb-4 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ${
                          alignRight ? "md:ml-auto" : ""
                        }`}
                      >
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <h3 className="mb-3 text-xl font-semibold text-foreground md:text-2xl">
                        {feature.title}
                      </h3>
                      <p className="mb-4 text-muted-foreground md:text-base">
                        {feature.description}
                      </p>
                      {feature.details && (
                        <ul
                          className={`space-y-2 ${
                            alignRight ? "md:flex md:flex-col md:items-end" : ""
                          }`}
                        >
                          {feature.details.map((detail) => (
                            <li
                              key={detail}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {feature.screenshot ? (
                      <div className="flex-1 md:flex-[0.9]">
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxScreenshot(feature.screenshot!)
                          }
                          className="group relative block w-full overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <div className="relative aspect-video">
                            <Image
                              src={feature.screenshot.src}
                              alt={feature.screenshot.alt}
                              fill
                              sizes="(max-width: 768px) 100vw, 45vw"
                              className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-background/0 transition-colors group-hover:bg-background/10">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                <Maximize2 className="h-5 w-5" />
                              </span>
                            </div>
                          </div>
                          <div className="border-t border-border bg-card/50 px-4 py-3">
                            <p className="text-sm font-medium text-foreground">
                              {feature.screenshot.title}
                            </p>
                            {feature.screenshot.description && (
                              <p className="text-xs text-muted-foreground">
                                {feature.screenshot.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </div>
                    ) : null}
                  </motion.article>
                );
              })}
            </div>

            {/* Lightbox for screenshot full-size view */}
            <AnimatePresence>
              {lightboxScreenshot && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-xl"
                  onClick={() => setLightboxScreenshot(null)}
                >
                  <button
                    type="button"
                    onClick={() => setLightboxScreenshot(null)}
                    className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex h-8 items-center gap-1.5 border-b border-border bg-secondary/50 px-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                      <div className="h-2.5 w-2.5 rounded-full bg-checkin/60" />
                      <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                    </div>
                    <div className="relative">
                      <Image
                        src={lightboxScreenshot.src}
                        alt={lightboxScreenshot.alt}
                        width={1280}
                        height={720}
                        className="h-auto max-h-[calc(85vh-80px)] w-auto object-contain"
                      />
                    </div>
                    <div className="border-t border-border bg-card p-4">
                      <p className="font-medium text-foreground">
                        {lightboxScreenshot.title}
                      </p>
                      {lightboxScreenshot.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {lightboxScreenshot.description}
                        </p>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </AnimatePresence>

      {/* CTA Section */}
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

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Pretvia"
              width={24}
              height={24}
              className="h-6 w-6 object-contain dark:hidden"
            />
            <Image
              src="/logo_dark_white.png"
              alt="Pretvia"
              width={24}
              height={24}
              className="hidden h-6 w-6 object-contain dark:block"
            />
            <span className="font-brand text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Pretvia
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <div className="flex items-center gap-1">
              <ChartNoAxesCombined className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                En garde, Pretvia, Allez!
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
