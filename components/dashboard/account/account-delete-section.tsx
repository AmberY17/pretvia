"use client";

import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface AccountDeleteSectionProps {
  deleteConfirmOpen: boolean;
  setDeleteConfirmOpen: (v: boolean) => void;
  deleting: boolean;
  onDeleteAccount: () => void;
}

export function AccountDeleteSection({
  deleteConfirmOpen,
  setDeleteConfirmOpen,
  deleting,
  onDeleteAccount,
}: AccountDeleteSectionProps) {
  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-destructive">
        <Trash2 className="h-4 w-4" />
        Delete Account
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Permanently delete your account and all associated data. This action
        cannot be undone.
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
              This will permanently delete your account, all your logs, and any
              groups you coach. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteAccount}
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
  );
}
