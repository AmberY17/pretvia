"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { mutate } from "swr";
import { Loader2 } from "lucide-react";
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

type InviteData = {
  type: string;
  email: string;
  athleteEmail: string | null;
  groupId: string;
  groupName: string | null;
};

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params?.token as string;
  const fromOAuth = searchParams?.get("from_oauth") === "1";
  const { data: session } = useSWR<{ user: { email?: string } | null }>("/api/auth/session", (u) => fetch(u).then((r) => r.json()));
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok && data.error) {
          setError(data.error);
          setInvite(null);
        } else {
          setInvite(data);
          setError(null);
        }
      })
      .catch(() => setError("Could not load invite"))
      .finally(() => setLoading(false));
  }, [token]);

  const redeem = useCallback(
    async (body: Record<string, unknown>): Promise<{ requiresChildVerification?: boolean; redirect?: string } | undefined> => {
      if (!token) return;
      setRedeeming(true);
      try {
        const res = await fetch(`/api/invites/${token}/redeem`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Something went wrong");
          setRedeeming(false);
          return;
        }
        mutate("/api/auth/session", undefined, { revalidate: true });
        if (!data.requiresChildVerification && data.redirect) {
          router.push(data.redirect);
        }
        return data;
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setRedeeming(false);
      }
    },
    [token, router]
  );

  const autoRedeemAttempted = useRef(false);
  useEffect(() => {
    if (!fromOAuth || !invite || !session?.user?.email || autoRedeemAttempted.current) return;
    const match = session.user.email?.toLowerCase() === invite.email?.toLowerCase();
    if (match && (invite.type === "athlete" || invite.type === "parent")) {
      autoRedeemAttempted.current = true;
      setRedeeming(true);
      redeem({ createAccount: false, email: invite.email }).finally(() => setRedeeming(false));
    }
  }, [fromOAuth, invite, session?.user?.email, redeem]);

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading invite...</p>
        </div>
      </main>
    );
  }

  if (error || !invite) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Invite invalid</CardTitle>
              <CardDescription>
                {error || "This invite may have expired or already been used."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/auth">Go to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (invite.type === "under13_parent") {
    return (
      <InviteUnder13Form
        invite={invite}
        redeem={redeem}
        redeeming={redeeming}
      />
    );
  }

  if (invite.type === "athlete") {
    return (
      <InviteAthleteForm
        token={token}
        invite={invite}
        redeem={redeem}
        redeeming={redeeming}
      />
    );
  }

  if (invite.type === "parent") {
    return (
      <InviteParentForm
        token={token}
        invite={invite}
        redeem={redeem}
        redeeming={redeeming}
      />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <p className="text-muted-foreground">Unknown invite type</p>
    </main>
  );
}

function InviteUnder13Form({
  invite,
  redeem,
  redeeming,
}: {
  invite: InviteData;
  redeem: (body: Record<string, unknown>) => Promise<{ requiresChildVerification?: boolean } | undefined>;
  redeeming: boolean;
}) {
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [childEmail, setChildEmail] = useState("");
  const [childPassword, setChildPassword] = useState("");
  const [childDateOfBirth, setChildDateOfBirth] = useState("");
  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [requiresChildVerification, setRequiresChildVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (childEmail.trim().toLowerCase() === invite.email.toLowerCase()) {
      toast.error("Child's email must be different from your email");
      return;
    }
    const result = await redeem({
      childFirstName,
      childLastName,
      childEmail,
      childPassword,
      childDateOfBirth: childDateOfBirth || undefined,
      parentFirstName,
      parentLastName,
      parentEmail: invite.email,
      parentPassword,
    });
    if (result?.requiresChildVerification) {
      toast.success(result.message ?? "Check your child's email to verify their account.");
      setRequiresChildVerification(true);
    }
  };

  if (requiresChildVerification) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[150px]" />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <Link
            href="/auth"
            className="mb-8 inline-flex gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </Link>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Check your child&apos;s email</CardTitle>
              <CardDescription>
                We&apos;ve sent a verification link to {childEmail}. Once they click it, their account
                will be created and you&apos;ll be able to sign in to view their progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/auth">Go to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[150px]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/auth"
          className="mb-8 inline-flex gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Back to sign in
        </Link>
        <Card className="border-border bg-card">
          <CardHeader>
            <Image src="/logo.png" alt="Pretvia" width={44} height={44} className="mb-2 h-11 w-11 object-contain dark:hidden" />
            <Image src="/logo_dark_white.png" alt="Pretvia" width={44} height={44} className="mb-2 hidden h-11 w-11 object-contain dark:block" />
            <CardTitle>Set up your child&apos;s account</CardTitle>
            <CardDescription>
              {invite.groupName ? `Join ${invite.groupName}` : "Create an athlete account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Child&apos;s first name</Label>
                <Input
                  value={childFirstName}
                  onChange={(e) => setChildFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Child&apos;s last name</Label>
                <Input
                  value={childLastName}
                  onChange={(e) => setChildLastName(e.target.value)}
                  placeholder="Last name"
                  required
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Child&apos;s email</Label>
                <Input
                  type="email"
                  value={childEmail}
                  onChange={(e) => setChildEmail(e.target.value)}
                  placeholder="child@example.com"
                  required
                  className="bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Use a different email than your parent account.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Child&apos;s date of birth</Label>
                <Input
                  type="date"
                  value={childDateOfBirth}
                  onChange={(e) => setChildDateOfBirth(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Child&apos;s password</Label>
                <Input
                  type="password"
                  value={childPassword}
                  onChange={(e) => setChildPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="my-2 border-t border-border" />
              <p className="text-sm font-medium text-foreground">Your parent account</p>
              <div className="space-y-2">
                <Label className="text-foreground">Your first name</Label>
                <Input
                  value={parentFirstName}
                  onChange={(e) => setParentFirstName(e.target.value)}
                  placeholder="First name"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Your last name</Label>
                <Input
                  value={parentLastName}
                  onChange={(e) => setParentLastName(e.target.value)}
                  placeholder="Last name"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Your email</Label>
                <Input type="email" value={invite.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Your password</Label>
                <Input
                  type="password"
                  value={parentPassword}
                  onChange={(e) => setParentPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  className="bg-secondary border-border"
                />
              </div>
              <Button type="submit" disabled={redeeming} className="mt-2 w-full">
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set up and continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function InviteAthleteForm({
  token,
  invite,
  redeem,
  redeeming,
}: {
  token: string;
  invite: InviteData;
  redeem: (body: Record<string, unknown>) => Promise<void>;
  redeeming: boolean;
}) {
  const [isLogin, setIsLogin] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(invite.email);
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  useEffect(() => {
    setEmail(invite.email);
  }, [invite.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invite.email, password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        toast.error(loginData.error || "Login failed");
        return;
      }
      mutate("/api/auth/session", undefined, { revalidate: true });
      await redeem({
        createAccount: false,
        email: invite.email,
      });
    } else {
      await redeem({
        createAccount: true,
        firstName,
        lastName,
        email: invite.email,
        password,
        dateOfBirth: dateOfBirth || undefined,
      });
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[150px]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Link href="/auth" className="mb-8 inline-flex gap-2 text-sm text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
        <Card className="border-border bg-card">
          <CardHeader>
            <Image src="/logo.png" alt="Pretvia" width={44} height={44} className="mb-2 h-11 w-11 object-contain dark:hidden" />
            <Image src="/logo_dark_white.png" alt="Pretvia" width={44} height={44} className="mb-2 hidden h-11 w-11 object-contain dark:block" />
            <CardTitle>Join {invite.groupName ?? "the group"}</CardTitle>
            <CardDescription>
              {invite.email} — create an account or sign in to join
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>First name</Label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required={!isLogin} className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last name</Label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required={!isLogin} className="bg-secondary border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of birth</Label>
                    <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="bg-secondary border-border" />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "Your password" : "Min. 6 characters"}
                  required
                  minLength={6}
                  className="bg-secondary border-border"
                />
              </div>
              <Button type="submit" disabled={redeeming} className="mt-2 w-full">
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : isLogin ? "Sign in and join" : "Create account and join"}
              </Button>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {isLogin ? "Create new account instead" : "Already have an account? Sign in"}
              </button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => { window.location.href = `/api/auth/google?invite=${token}`; }}
              >
                Continue with Google
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function InviteParentForm({
  token,
  invite,
  redeem,
  redeeming,
}: {
  token: string;
  invite: InviteData;
  redeem: (body: Record<string, unknown>) => Promise<{ redirect?: string } | undefined>;
  redeeming: boolean;
}) {
  const [isLogin, setIsLogin] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invite.email, password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        toast.error(loginData.error || "Login failed");
        return;
      }
      mutate("/api/auth/session", undefined, { revalidate: true });
      await redeem({ createAccount: false, email: invite.email });
    } else {
      await redeem({
        createAccount: true,
        firstName,
        lastName,
        email: invite.email,
        password,
      });
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[150px]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Link href="/auth" className="mb-8 inline-flex gap-2 text-sm text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
        <Card className="border-border bg-card">
          <CardHeader>
            <Image src="/logo.png" alt="Pretvia" width={44} height={44} className="mb-2 h-11 w-11 object-contain dark:hidden" />
            <Image src="/logo_dark_white.png" alt="Pretvia" width={44} height={44} className="mb-2 hidden h-11 w-11 object-contain dark:block" />
            <CardTitle>{isLogin ? "Sign in" : "Create your parent account"}</CardTitle>
            <CardDescription>
              View your athlete&apos;s progress in {invite.groupName ?? "the group"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>First name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required={!isLogin} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required={!isLogin} className="bg-secondary border-border" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={invite.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "Your password" : "Min. 6 characters"}
                  required
                  minLength={6}
                  className="bg-secondary border-border"
                />
              </div>
              <Button type="submit" disabled={redeeming} className="mt-2 w-full">
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : isLogin ? "Sign in and continue" : "Create account"}
              </Button>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {isLogin ? "Create new account instead" : "Already have an account? Sign in"}
              </button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => { window.location.href = `/api/auth/google?invite=${token}`; }}
              >
                Continue with Google
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
