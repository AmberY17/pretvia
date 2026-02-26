"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (password !== confirm) {
        toast.error("Passwords do not match");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Something went wrong");
        } else {
          setSuccess(true);
        }
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [token, password, confirm],
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/auth"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <Image
              src="/logo.png"
              alt="Pretvia"
              width={44}
              height={44}
              className="mb-2 h-11 w-11 object-contain dark:hidden"
            />
            <Image
              src="/logo_dark_white.png"
              alt="Pretvia"
              width={44}
              height={44}
              className="mb-2 hidden h-11 w-11 object-contain dark:block"
            />
            <CardTitle className="text-2xl text-foreground">
              {success ? "Password updated" : "Set new password"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {success
                ? "Your password has been changed. You can now sign in."
                : "Choose a strong password for your account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-4 py-2">
                <CheckCircle2 className="h-10 w-10 text-primary" />
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => router.push("/auth")}
                >
                  Sign in
                </Button>
              </div>
            ) : !token ? (
              <p className="text-sm text-destructive">
                Invalid or missing reset link. Please{" "}
                <Link href="/auth" className="underline hover:text-foreground">
                  request a new one
                </Link>
                .
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-password" className="text-foreground">
                    New password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-password" className="text-foreground">
                    Confirm password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
