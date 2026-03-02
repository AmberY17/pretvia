"use client";

import { Settings, Plus, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import type { Role } from "@/types/dashboard";

interface GroupRolesSectionProps {
  newRoleName: string;
  setNewRoleName: (v: string) => void;
  editingRoleId: string | null;
  addingRole: boolean;
  saving: boolean;
  deleteRoleConfirmOpen: boolean;
  setDeleteRoleConfirmOpen: (v: boolean) => void;
  roles: Role[];
  onAddRole: () => void;
  onUpdateRole: () => void;
  onDeleteRole: (roleId?: string) => void;
  onCancelEdit: () => void;
  onSelectRole: (roleId: string, name: string) => void;
}

export function GroupRolesSection({
  newRoleName,
  setNewRoleName,
  editingRoleId,
  addingRole,
  saving,
  deleteRoleConfirmOpen,
  setDeleteRoleConfirmOpen,
  roles,
  onAddRole,
  onUpdateRole,
  onDeleteRole,
  onCancelEdit,
  onSelectRole,
}: GroupRolesSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
        <Settings className="h-4 w-4" />
        Roles
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Create custom roles (e.g. Sabre, Foil, Epee) and assign them to
        athletes.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          placeholder="e.g. Sabre"
          className="flex-1 min-w-[140px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (editingRoleId) onUpdateRole();
              else onAddRole();
            }
          }}
        />
        {editingRoleId ? (
          <>
            <Button
              variant="ghost-primary"
              onClick={onUpdateRole}
              disabled={saving || !newRoleName.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Update
            </Button>
            <Button
              variant="ghost-destructive"
              onClick={() => setDeleteRoleConfirmOpen(true)}
              disabled={saving}
            >
              Delete
            </Button>
            <DeleteConfirmDialog
              open={deleteRoleConfirmOpen}
              onOpenChange={setDeleteRoleConfirmOpen}
              description="Athletes will lose this role assignment."
              onConfirm={() => onDeleteRole()}
            />
            <Button
              variant="ghost-primary"
              onClick={onCancelEdit}
              disabled={saving}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="ghost-primary"
            onClick={onAddRole}
            disabled={addingRole || !newRoleName.trim()}
          >
            {addingRole ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Role
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelectRole(r.id, r.name)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              editingRoleId === r.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary text-foreground hover:border-primary/30 hover:bg-secondary/80"
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>
    </section>
  );
}
