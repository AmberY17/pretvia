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
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
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
          <Link
            href={backHref}
            className="flex shrink-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Link>
          <span className="truncate text-base font-semibold text-foreground">
            {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
