"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Loader2, Users, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CardContent } from "@/components/ui/card";
import { AuthCardHeader } from "@/components/auth/auth-card-header";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SignupRole = "athlete" | "coach";

interface SignUpFormProps {
  onSwitchToLogin: () => void;
}

export function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const waitlistToken = searchParams.get("token");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth] = useState("");
  const [role, setRole] = useState<SignupRole>(
    searchParams.get("signup") === "coach" ? "coach" : "athlete"
  );
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Chrome does not enforce minLength on password inputs; use setCustomValidity
  useEffect(() => {
    const input = passwordInputRef.current;
    if (!input) return;
    if (password.length > 0 && password.length < 6) {
      input.setCustomValidity("Password must be at least 6 characters");
    } else {
      input.setCustomValidity("");
    }
  }, [password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const fn = firstName.trim();
      const ln = lastName.trim();
      if (fn.length < 2 || ln.length < 2) {
        toast.error("First and last name must be at least 2 characters each");
        return;
      }
      if (!agreedToTerms) {
        toast.error("Please agree to the Terms of Service and Privacy Policy");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            firstName: fn,
            lastName: ln,
            displayName: `${fn} ${ln}`,
            dateOfBirth: role === "athlete" && dateOfBirth ? dateOfBirth : undefined,
            role,
            waitlistToken: waitlistToken ?? undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Something went wrong");
          setLoading(false);
          return;
        }
        if (data.requiresVerification) {
          toast.success(
            data.message || "Check your email to verify your account.",
          );
          setLoading(false);
          return;
        }
        queryClient.setQueryData(queryKeys.auth.session, {
          user: { ...data.user, group: null },
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
        router.push("/dashboard");
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [firstName, lastName, email, password, dateOfBirth, role, waitlistToken, agreedToTerms, router, queryClient],
  );

  const isCoach = role === "coach";

  return (
    <>
      <AuthCardHeader
        title="Create your account"
        description="Start tracking your training visually"
      />
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Role Selector */}
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
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  role === "athlete"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/30",
                )}
              >
                <Dumbbell className="h-4 w-4" />
                Athlete
              </button>
              <button
                type="button"
                onClick={() => setRole("coach")}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  role === "coach"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/30",
                )}
              >
                <Users className="h-4 w-4" />
                Coach
              </button>
            </div>
            {role === "athlete" && (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                Athletes need an invite from their coach to join. Ask your coach
                for an invite link.
              </p>
            )}
          </motion.div>

          {/* Coach: no token — waitlist gate */}
          {isCoach && !waitlistToken && (
            <>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                Pretvia is currently invite-only for coaches. Join the waitlist to
                request early access.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => router.push("/waitlist")}
              >
                Join the waitlist
              </Button>
            </>
          )}

          {/* Coach: valid token — full signup form */}
          {isCoach && !!waitlistToken && (
            <>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="firstName" className="text-foreground">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      minLength={2}
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-foreground">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      minLength={2}
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </motion.div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Gmail, Outlook, or Yahoo"
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
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  ref={passwordInputRef}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(v) => setAgreedToTerms(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    Privacy Policy
                  </a>
                </label>
              </div>
              <Button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Account"
                )}
              </Button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <GoogleAuthButton variant="signup" />
            </>
          )}
        </form>
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Already have an account? Sign in
          </button>
        </div>
      </CardContent>
    </>
  );
}
