"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function LandingNav({
  primaryLink,
  secondaryLink,
}: {
  primaryLink: { href: string; label: string };
  secondaryLink?: { href: string; label: string };
}) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Pretvia"
            width={28}
            height={28}
            className="h-7 w-7 object-contain dark:hidden"
          />
          <Image
            src="/logo_dark.png"
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
          <Link href={primaryLink.href}>
            <Button variant="ghost" size="sm">
              {primaryLink.label}
            </Button>
          </Link>
          {secondaryLink && (
            <Link href={secondaryLink.href}>
              <Button variant="ghost" size="sm">
                {secondaryLink.label}
              </Button>
            </Link>
          )}
          <Link href="/auth">
            <Button variant="ghost-secondary" size="sm" className="gap-2">
              Sign In
            </Button>
          </Link>
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
