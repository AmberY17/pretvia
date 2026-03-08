"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import type {
  RoleSection,
  FeatureScreenshot,
} from "@/components/landing/features-data";

export function FeaturesSectionContent({
  activeSection,
  onScreenshotClick,
}: {
  activeSection: RoleSection;
  onScreenshotClick: (screenshot: FeatureScreenshot) => void;
}) {
  return (
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
                    onClick={() => onScreenshotClick(feature.screenshot!)}
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
    </div>
  );
}
