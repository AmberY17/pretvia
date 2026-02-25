"use client";

import React, { useRef } from "react";
import {
  Users,
  Search,
  ChevronDown,
  Check,
  ArrowRightLeft,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useClickOutside } from "@/hooks/use-click-outside";
import type { Member, Role } from "@/types/dashboard";

interface GroupAthletesSectionProps {
  athletes: Member[];
  allAthletes: Member[];
  athleteSearch: string;
  setAthleteSearch: (v: string) => void;
  roles: Role[];
  roleDropdownAthleteId: string | null;
  setRoleDropdownAthleteId: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  transferUserId: string | null;
  setTransferUserId: React.Dispatch<React.SetStateAction<string | null>>;
  transferGroupId: string;
  setTransferGroupId: (v: string) => void;
  transferDropdownOpen: boolean;
  setTransferDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  transferSearch: string;
  setTransferSearch: (v: string) => void;
  transferableGroups: { id: string; name: string }[];
  filteredTransferGroups: { id: string; name: string }[];
  removeConfirmUserId: string | null;
  setRemoveConfirmUserId: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  saving: boolean;
  onAssignRoles: (userId: string, roleIds: string[]) => void;
  onTransfer: () => void;
  onRemoveAthlete: (userId: string) => void;
}

export function GroupAthletesSection({
  athletes,
  allAthletes,
  athleteSearch,
  setAthleteSearch,
  roles,
  roleDropdownAthleteId,
  setRoleDropdownAthleteId,
  transferUserId,
  setTransferUserId,
  transferGroupId,
  setTransferGroupId,
  transferDropdownOpen,
  setTransferDropdownOpen,
  transferSearch,
  setTransferSearch,
  transferableGroups,
  filteredTransferGroups,
  removeConfirmUserId,
  setRemoveConfirmUserId,
  saving,
  onAssignRoles,
  onTransfer,
  onRemoveAthlete,
}: GroupAthletesSectionProps) {
  const transferDropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(transferDropdownRef, transferDropdownOpen, () =>
    setTransferDropdownOpen(false),
  );
  useClickOutside(roleDropdownRef, !!roleDropdownAthleteId, () =>
    setRoleDropdownAthleteId(null),
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
        <Users className="h-4 w-4" />
        Athletes
      </h2>
      {allAthletes.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search athletes by name or email..."
            value={athleteSearch}
            onChange={(e) => setAthleteSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      {allAthletes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No athletes in this group yet. Share the group code to invite them.
        </p>
      ) : athletes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No athletes match your search.
        </p>
      ) : (
        <div
          className={`space-y-4 ${
            athletes.length > 4
              ? "max-h-[340px] overflow-y-auto scrollbar-hidden"
              : ""
          }`}
        >
          {athletes.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">
                  {a.displayName || a.email}
                </p>
                <p className="text-xs text-muted-foreground">{a.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {roles.length > 0 && (
                  <div
                    className="relative"
                    ref={
                      roleDropdownAthleteId === a.id ? roleDropdownRef : undefined
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
                                    roles.find((r) => r.id === rid)?.name ??
                                    rid,
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
                                    : a.roleIds.filter((id) => id !== r.id);
                                  onAssignRoles(a.id, next);
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
                              onChange={(e) => setTransferSearch(e.target.value)}
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
                      onClick={() => onTransfer()}
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
                            This athlete will be removed from the group.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              removeConfirmUserId &&
                              onRemoveAthlete(removeConfirmUserId)
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
  );
}
