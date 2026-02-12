"use client";

import React from "react";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
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

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

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
          toast.success("Account created!");
          // Update SWR cache so dashboard sees the user immediately (avoids redirect race)
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
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">
                    TL
                  </span>
                </div>
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
