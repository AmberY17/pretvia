"use client";

import React, { Suspense } from "react";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { mutate } from "swr";
import { ArrowLeft, Loader2, Users, Dumbbell } from "lucide-react";
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

const ERROR_MESSAGES: Record<string, string> = {
  verification_expired: "Verification link expired. Please sign up again.",
  verification_failed: "Verification failed. Please try again.",
  access_denied: "Sign-in was cancelled.",
  invalid_callback: "Invalid sign-in response. Please try again.",
  invalid_state: "Invalid state. Please try again.",
  oauth_error: "Something went wrong with sign-in. Please try again.",
  oauth_not_configured: "Google sign-in is not configured.",
  token_exchange_failed: "Sign-in failed. Please try again.",
  userinfo_failed: "Could not get your profile. Please try again.",
  no_email: "Google did not provide an email. Please try another account.",
  already_exists: "This email is already verified. Please sign in.",
};

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error && ERROR_MESSAGES[error]) {
      toast.error(ERROR_MESSAGES[error]);
      router.replace("/auth", { scroll: false });
    }
  }, [searchParams, router]);

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup-only fields
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"athlete" | "coach">("athlete");

  const handleAuth = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        if (isLogin) {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error || "Something went wrong");
            setLoading(false);
            return;
          }
          // Update SWR cache so dashboard sees the user immediately (avoids redirect race)
          mutate(
            "/api/auth/session",
            { user: { ...data.user, group: null } },
            { revalidate: true },
          );
          router.push("/dashboard");
        } else {
          if (displayName.trim().length < 2) {
            toast.error("Display name must be at least 2 characters");
            setLoading(false);
            return;
          }
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password,
              displayName: displayName.trim(),
              role,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error || "Something went wrong");
            setLoading(false);
            return;
          }
          if (data.requiresVerification) {
            toast.success(data.message || "Check your email to verify your account.");
            setLoading(false);
            return;
          }
          toast.success("Account created!");
          mutate(
            "/api/auth/session",
            { user: { ...data.user, group: null } },
            { revalidate: true },
          );
          router.push("/dashboard");
        }
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, isLogin, displayName, role, router],
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? "login" : "signup"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
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
                  {isLogin ? "Welcome back" : "Create your account"}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {isLogin
                    ? "Sign in to access your training dashboard"
                    : "Start tracking your training visually"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                  {/* Signup-only: Display Name */}
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-2"
                    >
                      <Label htmlFor="displayName" className="text-foreground">
                        Display Name
                      </Label>
                      <Input
                        id="displayName"
                        type="text"
                        placeholder="Your name or alias"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required={!isLogin}
                        minLength={2}
                        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </motion.div>
                  )}

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email" className="text-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password" className="text-foreground">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={
                        isLogin ? "Enter your password" : "Min. 6 characters"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Signup-only: Role Selector */}
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-2"
                    >
                      <Label className="text-foreground">I am a...</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRole("athlete")}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            role === "athlete"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <Dumbbell className="h-4 w-4" />
                          Athlete
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole("coach")}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            role === "coach"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <Users className="h-4 w-4" />
                          Coach
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isLogin ? (
                      "Sign In"
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      window.location.href = "/api/auth/google";
                    }}
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    {isLogin ? "Sign in with Google" : "Sign up with Google"}
                  </Button>
                </form>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {isLogin
                      ? "Don't have an account? Sign up"
                      : "Already have an account? Sign in"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    }>
      <AuthForm />
    </Suspense>
  );
}
