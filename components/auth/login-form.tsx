"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent } from "@/components/ui/card";
import { AuthCardHeader } from "@/components/auth/auth-card-header";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { toast } from "sonner";

interface LoginFormProps {
  onForgotPassword: (email: string) => void;
  onSwitchToSignUp: () => void;
}

export function LoginForm({ onForgotPassword, onSwitchToSignUp }: LoginFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [eggForgotPassword, setEggForgotPassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/egg")
      .then((r) => r.json())
      .then((data) => setEggForgotPassword(data.eggForgotPassword ?? false))
      .catch(() => {})
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
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
    [email, password, router, queryClient],
  );

  return (
    <>
      <AuthCardHeader
        title="Welcome back"
        description="Sign in to access your training dashboard"
      />
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <button
                type="button"
                onClick={() => {
                  if (eggForgotPassword && password) {
                    toast("Hmm, have you tried this one? fenceramber15", { duration: 5000 })
                    return
                  }
                  onForgotPassword(email)
                }}
                className="text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
              "Sign In"
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
          <GoogleAuthButton variant="signin" />
        </form>
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Don&apos;t have an account? Sign up
          </button>
        </div>
      </CardContent>
    </>
  );
}
