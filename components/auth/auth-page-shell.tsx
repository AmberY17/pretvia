"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AuthPageShellProps {
  children: React.ReactNode;
  /** When provided, renders a Link. When not provided, no back control is shown. */
  backHref?: string;
  /** For button-style back (e.g. "Back to sign in"). Use with onBack. */
  backLabel?: string;
  onBack?: () => void;
}

export function AuthPageShell({
  children,
  backHref,
  backLabel,
  onBack,
}: AuthPageShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[150px]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        {backHref && (
          <Link
            href={backHref}
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        )}
        {backLabel && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
        )}
        {children}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  );
}
