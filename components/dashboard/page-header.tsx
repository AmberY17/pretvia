"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";

interface PageHeaderProps {
  title: string;
  backHref?: string;
}

export function PageHeader({ title, backHref = "/dashboard" }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={backHref}
            className="hidden shrink-0 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground lg:flex lg:w-[4.5rem]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
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
          </div>
          <span className="truncate text-base font-semibold text-foreground">
            {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={backHref}
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
