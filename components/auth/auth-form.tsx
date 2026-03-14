"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";
import { SignUpForm } from "@/components/auth/signup-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { SignedInChoice } from "@/components/auth/signed-in-choice";
import { Card } from "@/components/ui/card";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth-errors";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { toast } from "sonner";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, mutate: mutateAuth } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotInitialEmail, setForgotInitialEmail] = useState("");

  // Track whether the user already had a session when /auth was first loaded.
  // null = not yet determined, true = was logged in on arrival, false = was not.
  // The "You're signed in" modal should only show when this is true.
  const [sessionOnMount, setSessionOnMount] = useState<boolean | null>(null);

  useEffect(() => {
    if (sessionOnMount === null && !authLoading) {
      setSessionOnMount(!!user);
    }
  }, [authLoading, user, sessionOnMount]);

  // Force fresh session on mount (avoid stale cache from previous visit)
  useEffect(() => {
    mutateAuth();
  }, [mutateAuth]);

  // Revalidate session when tab gains focus so we pick up verification from another tab
  useEffect(() => {
    const onFocus = () => mutateAuth();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [mutateAuth]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast.error(
        AUTH_ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.",
      );
      router.replace("/auth", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams.get("signup") === "coach") setIsLogin(false);
  }, [searchParams]);

  const handleForgotPassword = useCallback((email: string) => {
    setForgotInitialEmail(email);
    setShowForgot(true);
  }, []);

  const handleForgotBack = useCallback(() => {
    setShowForgot(false);
    setForgotInitialEmail("");
  }, []);

  const handleSwitchToSignUp = useCallback(() => {
    setIsLogin(false);
  }, []);

  const handleSwitchToLogin = useCallback(() => {
    setIsLogin(true);
  }, []);

  // Still resolving the initial session, or user just logged in and redirect is in flight
  if (
    authLoading ||
    sessionOnMount === null ||
    (user && !sessionOnMount)
  ) {
    return <LoadingScreen />;
  }

  if (user && sessionOnMount) {
    return <SignedInChoice />;
  }

  if (showForgot) {
    return (
      <ForgotPasswordForm
        onBack={handleForgotBack}
        initialEmail={forgotInitialEmail}
      />
    );
  }

  return (
    <AuthPageShell backHref="/">
      <AnimatePresence mode="wait">
        <motion.div
          key={isLogin ? "login" : "signup"}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="border-border bg-card">
            {isLogin ? (
              <LoginForm
                onForgotPassword={handleForgotPassword}
                onSwitchToSignUp={handleSwitchToSignUp}
              />
            ) : (
              <SignUpForm onSwitchToLogin={handleSwitchToLogin} />
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </AuthPageShell>
  );
}
