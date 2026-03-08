"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AuthCardHeader } from "@/components/auth/auth-card-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface ForgotPasswordFormProps {
  onBack: () => void;
  initialEmail?: string;
}

export function ForgotPasswordForm({ onBack, initialEmail = "" }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Something went wrong");
        } else {
          setSent(true);
        }
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  return (
    <AuthPageShell backLabel="Back to sign in" onBack={onBack}>
      <Card className="border-border bg-card">
        <AuthCardHeader
          title="Reset password"
          description={
            sent
              ? "Check your email for a reset link."
              : "Enter your email and we'll send you a link to reset your password."
          }
        />
        {!sent && (
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="forgot-email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
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
                  "Send reset link"
                )}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </AuthPageShell>
  );
}
