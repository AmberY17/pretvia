"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

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
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDeleteConfirmOpen(true)}
      >
        Delete Account
      </Button>
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Are you sure you want to delete your account?"
        description="This will permanently delete your account, all your logs, and any groups you coach. This action cannot be undone."
        onConfirm={onDeleteAccount}
      />
    </section>
  );
}
