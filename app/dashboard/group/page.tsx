"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import useSWR from "swr";
import { urlFetcher } from "@/lib/swr-utils";
import {
  ArrowLeft,
  Settings,
  Users,
  Plus,
  Loader2,
  ArrowRightLeft,
  UserMinus,
  Check,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSwitcher } from "@/components/theme-switcher";
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

type Member = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  roleIds: string[];
};

type Role = { id: string; name: string };

export default function GroupManagementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [newRoleName, setNewRoleName] = useState("");
  const [addingRole, setAddingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [transferUserId, setTransferUserId] = useState<string | null>(null);
  const [transferGroupId, setTransferGroupId] = useState("");
  const [transferDropdownOpen, setTransferDropdownOpen] = useState(false);
  const [transferSearch, setTransferSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [roleDropdownAthleteId, setRoleDropdownAthleteId] = useState<
    string | null
  >(null);
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(
    null,
  );
  const [deleteRoleConfirmOpen, setDeleteRoleConfirmOpen] = useState(false);
  const transferDropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!transferDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        transferDropdownRef.current &&
        !transferDropdownRef.current.contains(e.target as Node)
      ) {
        setTransferDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [transferDropdownOpen]);

  useEffect(() => {
    if (!roleDropdownAthleteId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(e.target as Node)
      ) {
        setRoleDropdownAthleteId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [roleDropdownAthleteId]);

  const groupsUrl =
    user?.role === "coach" ? "/api/groups?mode=coach-groups" : null;
  const { data: coachGroupsData } = useSWR<{
    groups: { id: string; name: string }[];
  }>(
    groupsUrl && user ? [groupsUrl, user.id] : null,
    urlFetcher,
  );

  const membersUrl = user?.groupId
    ? `/api/groups?groupId=${user.groupId}`
    : null;
  const { data: membersData, mutate: mutateMembers } = useSWR<{
    members: Member[];
    roles: Role[];
  }>(
    membersUrl && user ? [membersUrl, user.id, user.groupId] : null,
    urlFetcher,
  );

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "coach")) {
      router.push("/dashboard");
    }
  }, [authLoading, user, router]);

  const athletes = (membersData?.members ?? []).filter(
    (m) => m.role !== "coach",
  );
  const roles = membersData?.roles ?? [];
  const coachGroups = coachGroupsData?.groups ?? [];
  const transferableGroups = coachGroups.filter((g) => g.id !== user?.groupId);
  const filteredTransferGroups = transferSearch.trim()
    ? transferableGroups.filter((g) =>
        g.name.toLowerCase().includes(transferSearch.trim().toLowerCase()),
      )
    : transferableGroups;

  const handleCancelEditRole = () => {
    setEditingRoleId(null);
    setNewRoleName("");
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !user?.groupId) return;
    setAddingRole(true);
    try {
      const res = await fetch(`/api/groups/${user.groupId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add role");
        return;
      }
      setNewRoleName("");
      mutateMembers();
      toast.success(`Role "${data.role.name}" added`);
    } catch {
      toast.error("Network error");
    } finally {
      setAddingRole(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRoleId || !newRoleName.trim() || !user?.groupId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${user.groupId}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: editingRoleId,
          name: newRoleName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
        return;
      }
      handleCancelEditRole();
      mutateMembers();
      toast.success("Role updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId?: string) => {
    const id = roleId ?? editingRoleId;
    if (!user?.groupId || !id) return;
    setDeleteRoleConfirmOpen(false);
    try {
      const res = await fetch(
        `/api/groups/${user.groupId}/roles?roleId=${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete role");
        return;
      }
      handleCancelEditRole();
      mutateMembers();
      toast.success("Role deleted");
    } catch {
      toast.error("Network error");
    }
  };

  const handleAssignRoles = async (userId: string, roleIds: string[]) => {
    if (!user?.groupId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${user.groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assignRoles", userId, roleIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update roles");
        return;
      }
      mutateMembers();
      toast.success("Roles updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAthlete = async (userId: string) => {
    if (!user?.groupId) return;
    setRemoveConfirmUserId(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${user.groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to remove");
        return;
      }
      mutateMembers();
      toast.success("Athlete removed");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferUserId || !transferGroupId || !user?.groupId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${user.groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          userId: transferUserId,
          targetGroupId: transferGroupId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to transfer");
        return;
      }
      setTransferUserId(null);
      setTransferGroupId("");
      setTransferDropdownOpen(false);
      setTransferSearch("");
      mutateMembers();
      toast.success("Athlete transferred");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || user.role !== "coach") {
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
              Manage Group
            </span>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {!user.groupId ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Join a group to manage it.
              </p>
              <Link href="/dashboard">
                <Button variant="ghost-primary" size="sm" className="mt-4">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Roles section */}
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                  <Settings className="h-4 w-4" />
                  Roles
                </h2>
                <p className="mb-4 text-xs text-muted-foreground">
                  Create custom roles (e.g. Sabre, Foil, Epee) and assign them
                  to athletes.
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
                        if (editingRoleId) handleUpdateRole();
                        else handleAddRole();
                      }
                    }}
                  />
                  {editingRoleId ? (
                    <>
                      <Button
                        variant="ghost-primary"
                        onClick={handleUpdateRole}
                        disabled={saving || !newRoleName.trim()}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Update
                      </Button>
                      <AlertDialog
                        open={deleteRoleConfirmOpen}
                        onOpenChange={setDeleteRoleConfirmOpen}
                      >
                        <Button
                          variant="ghost-destructive"
                          onClick={() => setDeleteRoleConfirmOpen(true)}
                          disabled={saving}
                        >
                          Delete
                        </Button>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you sure you want to delete?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Athletes will lose this role assignment.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRole()}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="ghost-primary"
                        onClick={handleCancelEditRole}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost-primary"
                      onClick={handleAddRole}
                      disabled={addingRole || !newRoleName.trim()}
                    >
                      {addingRole ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setEditingRoleId(r.id);
                        setNewRoleName(r.name);
                      }}
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

              {/* Athletes section */}
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                  <Users className="h-4 w-4" />
                  Athletes
                </h2>
                {athletes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No athletes in this group yet. Share the group code to
                    invite them.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {athletes.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {a.displayName || a.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {a.email}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Role multi-select dropdown */}
                          {roles.length > 0 && (
                            <div
                              className="relative"
                              ref={
                                roleDropdownAthleteId === a.id
                                  ? roleDropdownRef
                                  : undefined
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setRoleDropdownAthleteId((prev) =>
                                    prev === a.id ? null : a.id,
                                  )
                                }
                                className="flex min-w-[120px] items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/80 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <span className="truncate">
                                  {a.roleIds.length === 0
                                    ? "No roles"
                                    : a.roleIds.length <= 2
                                      ? a.roleIds
                                          .map(
                                            (rid) =>
                                              roles.find((r) => r.id === rid)
                                                ?.name ?? rid,
                                          )
                                          .join(", ")
                                      : `${a.roleIds.length} roles`}
                                </span>
                                <ChevronDown
                                  className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${roleDropdownAthleteId === a.id ? "rotate-180" : ""}`}
                                />
                              </button>
                              {roleDropdownAthleteId === a.id && (
                                <div className="absolute left-0 top-full z-50 mt-1 flex min-w-[160px] flex-col rounded-lg border border-border bg-card p-1 shadow-lg">
                                  <div
                                    className={`flex flex-col gap-0.5 ${
                                      roles.length > 5
                                        ? "max-h-32 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                        : ""
                                    }`}
                                  >
                                    {roles.map((r) => (
                                      <label
                                        key={r.id}
                                        className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={a.roleIds.includes(r.id)}
                                          onChange={(e) => {
                                            const next = e.target.checked
                                              ? [...a.roleIds, r.id]
                                              : a.roleIds.filter(
                                                  (id) => id !== r.id,
                                                );
                                            handleAssignRoles(a.id, next);
                                          }}
                                          className="rounded border-border"
                                        />
                                        {r.name}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {transferUserId === a.id ? (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <div
                                className="relative"
                                ref={transferDropdownRef}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTransferDropdownOpen((prev) => !prev)
                                  }
                                  className="flex min-w-[160px] items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/80 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    {transferGroupId
                                      ? (transferableGroups.find(
                                          (g) => g.id === transferGroupId,
                                        )?.name ?? "Select group")
                                      : "Select group"}
                                  </span>
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${transferDropdownOpen ? "rotate-180" : ""}`}
                                  />
                                </button>
                                {transferDropdownOpen && (
                                  <div className="absolute left-0 top-full z-50 mt-1 flex max-h-48 min-w-[200px] flex-col gap-1 rounded-lg border border-border bg-card p-1 shadow-lg">
                                    {transferableGroups.length >= 5 && (
                                      <input
                                        type="text"
                                        value={transferSearch}
                                        onChange={(e) =>
                                          setTransferSearch(e.target.value)
                                        }
                                        placeholder="Search groups..."
                                        className="mx-1 rounded-md border border-border bg-secondary px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                                      />
                                    )}
                                    {filteredTransferGroups.length === 0 ? (
                                      <p className="px-2.5 py-2 text-xs text-muted-foreground">
                                        No groups match
                                      </p>
                                    ) : (
                                      <div className="max-h-36 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                        {filteredTransferGroups.map((g) => (
                                          <button
                                            key={g.id}
                                            type="button"
                                            onClick={() => {
                                              setTransferGroupId(g.id);
                                              setTransferDropdownOpen(false);
                                              setTransferSearch("");
                                            }}
                                            className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                                              transferGroupId === g.id
                                                ? "bg-primary/10 font-medium text-primary"
                                                : "text-foreground hover:bg-secondary"
                                            }`}
                                          >
                                            <Users className="h-3 w-3 shrink-0" />
                                            <span className="flex-1 truncate">
                                              {g.name}
                                            </span>
                                            {transferGroupId === g.id && (
                                              <Check className="h-3 w-3 shrink-0 text-primary" />
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost-primary"
                                onClick={() => handleTransfer()}
                                disabled={!transferGroupId || saving}
                              >
                                Transfer
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost-primary"
                                onClick={() => {
                                  setTransferUserId(null);
                                  setTransferGroupId("");
                                  setTransferDropdownOpen(false);
                                  setTransferSearch("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost-primary"
                                onClick={() => {
                                  setRoleDropdownAthleteId(null);
                                  setTransferUserId(a.id);
                                }}
                                className="gap-1 text-xs"
                              >
                                <ArrowRightLeft className="h-3 w-3" />
                                Transfer
                              </Button>
                              <AlertDialog
                                open={removeConfirmUserId === a.id}
                                onOpenChange={(open) =>
                                  !open && setRemoveConfirmUserId(null)
                                }
                              >
                                <Button
                                  size="sm"
                                  variant="ghost-destructive"
                                  onClick={() => setRemoveConfirmUserId(a.id)}
                                  disabled={saving}
                                  className="gap-1 text-xs"
                                >
                                  <UserMinus className="h-3 w-3" />
                                  Remove
                                </Button>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure you want to remove?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This athlete will be removed from the
                                      group.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        removeConfirmUserId &&
                                        handleRemoveAthlete(removeConfirmUserId)
                                      }
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
