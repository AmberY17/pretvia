"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, Tag, Home, LogIn, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";

const LABEL_ICONS: Record<string, LucideIcon> = {
  Features: Sparkles,
  Pricing: Tag,
  Home: Home,
};

export function LandingNav({
  links,
}: {
  links?: { href: string; label: string }[];
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
          <span className="font-brand text-sm font-bold uppercase tracking-[0.15em] text-foreground sm:text-lg">
            Pretvia
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {links?.map((link) => {
            const Icon = LABEL_ICONS[link.label];
            return (
              <Link key={link.href} href={link.href}>
                <Button variant="ghost" size="sm" aria-label={link.label}>
                  {Icon && <Icon className="h-4 w-4 sm:hidden" />}
                  <span className="hidden sm:inline">{link.label}</span>
                </Button>
              </Link>
            );
          })}
          <Link href="/auth">
            <Button variant="ghost-secondary" size="sm" className="gap-2" aria-label="Sign In">
              <LogIn className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          </Link>
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
