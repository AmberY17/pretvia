"use client";

import Image from "next/image";
import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";

export function LandingFooter({
  footerLink,
  secondaryLink,
}: {
  footerLink: { href: string; label: string };
  secondaryLink?: { href: string; label: string };
}) {
  return (
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
            href={footerLink.href}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {footerLink.label}
          </Link>
          {secondaryLink && (
            <Link
              href={secondaryLink.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {secondaryLink.label}
            </Link>
          )}
          <div className="flex items-center gap-1">
            <ChartNoAxesCombined className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              En garde, Pretvia, Allez!
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
