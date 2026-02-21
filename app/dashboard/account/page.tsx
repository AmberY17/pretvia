"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, User, Trash2, Loader2, ChevronUp, ChevronDown, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { EmojiPicker } from "@/components/dashboard/emoji-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const COACH_FILTER_ORDER_KEY = "prets-coach-filter-order";
const DEFAULT_COACH_ORDER = [
  "sessions",
  "role",
  "reviewStatus",
  "athlete",
  "date",
] as const;

const FILTER_LABELS: Record<(typeof DEFAULT_COACH_ORDER)[number], string> = {
  sessions: "Training Sessions",
  role: "Role",
  reviewStatus: "Review Status",
  athlete: "Athlete",
  date: "Date",
};

type CoachFilterId = (typeof DEFAULT_COACH_ORDER)[number];

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, mutate: mutateAuth } = useAuth();
  const [profileEmoji, setProfileEmoji] = useState<string>("");
  const [savingEmoji, setSavingEmoji] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterOrder, setFilterOrder] = useState<CoachFilterId[]>([
    ...DEFAULT_COACH_ORDER,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(COACH_FILTER_ORDER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        const valid = DEFAULT_COACH_ORDER.filter((id) => parsed.includes(id));
        if (valid.length === DEFAULT_COACH_ORDER.length) {
          setFilterOrder(parsed as CoachFilterId[]);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const moveFilter = (index: number, direction: "up" | "down") => {
    const newOrder = [...filterOrder];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setFilterOrder(newOrder);
    localStorage.setItem(COACH_FILTER_ORDER_KEY, JSON.stringify(newOrder));
    toast.success("Filter order updated");
  };

  useEffect(() => {
    if (user?.profileEmoji !== undefined) {
      setProfileEmoji(user.profileEmoji || "");
    }
  }, [user?.profileEmoji]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  const handleEmojiChange = async (emoji: string) => {
    setSavingEmoji(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileEmoji: emoji }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update");
        return;
      }
      setProfileEmoji(emoji);
      mutateAuth();
      toast.success("Profile emoji updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSavingEmoji(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete account");
        return;
      }
      mutateAuth();
      router.push("/");
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">
                TL
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              Account Settings
            </span>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Profile emoji section */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <User className="h-4 w-4" />
              Profile Emoji
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Choose an emoji to represent you. It will appear next to your name
              in the sidebar and in comments.
            </p>
            <div className="flex items-center gap-4">
              <div className="relative">
                <EmojiPicker
                  value={profileEmoji}
                  onChange={handleEmojiChange}
                />
                {savingEmoji && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/60">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 items-center gap-2">
                {!profileEmoji && (
                  <p className="text-sm text-muted-foreground">
                    Click to choose an emoji
                  </p>
                )}
                {profileEmoji && (
                  <Button
                    variant="ghost-destructive"
                    size="sm"
                    onClick={() => handleEmojiChange("")}
                    disabled={savingEmoji}
                    className="h-7 text-xs"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Filter order (coach only) */}
          {user.role === "coach" && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                Filter Order
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Reorder the filter sections in your dashboard sidebar.
              </p>
              <div className="flex flex-col gap-2">
                {filterOrder.map((id, index) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2"
                  >
                    <span className="text-sm font-medium">
                      {FILTER_LABELS[id]}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost-secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveFilter(index, "up")}
                        disabled={index === 0}
                        aria-label={`Move ${FILTER_LABELS[id]} up`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost-secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveFilter(index, "down")}
                        disabled={index === filterOrder.length - 1}
                        aria-label={`Move ${FILTER_LABELS[id]} down`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Delete account section */}
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete Account
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete Account
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to delete your account?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account, all your logs,
                    and any groups you coach. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>
      </main>
    </div>
  );
}
