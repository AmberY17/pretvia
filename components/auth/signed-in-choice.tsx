"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AuthCardHeader } from "@/components/auth/auth-card-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export function SignedInChoice() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  if (!user) return null;

  const handleContinueAs = () => {
    router.replace("/dashboard");
  };

  const handleUseDifferentAccount = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      queryClient.clear();
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  };

  return (
    <AuthPageShell backHref="/">
      <Card className="border-border bg-card">
        <AuthCardHeader
          title="You're signed in"
          description="Choose how to continue"
        />
        <CardContent className="flex flex-col gap-3">
          <Button
            onClick={handleContinueAs}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Continue as {user.email}
          </Button>
          <Button
            variant="outline"
            onClick={handleUseDifferentAccount}
            className="w-full"
          >
            Sign in with different account
          </Button>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
