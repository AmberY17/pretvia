"use client";

import Image from "next/image";
import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";

export function LandingFooter({
  links,
}: {
  links?: { href: string; label: string }[];
}) {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="Pretvia"
            width={24}
            height={24}
            className="h-6 w-6 object-contain dark:hidden"
          />
          <Image
            src="/logo_dark.png"
            alt="Pretvia"
            width={24}
            height={24}
            className="hidden h-6 w-6 object-contain dark:block"
          />
        </div>
        <div className="flex items-center gap-4">
          {links?.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <div className="hidden sm:flex items-center gap-1">
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
