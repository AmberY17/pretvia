"use client";

import { X } from "lucide-react";

type Role = { id: string; name: string };

interface RoleFilterProps {
  roles: Role[];
  filterRoleId: string | null;
  onFilter: (roleId: string | null) => void;
  variant?: "sidebar" | "mobile";
  hideHeader?: boolean;
}

export function RoleFilter({
  roles,
  filterRoleId,
  onFilter,
  variant = "sidebar",
  hideHeader = false,
}: RoleFilterProps) {
  if (roles.length === 0) return null;

  const isSidebar = variant === "sidebar";

  const buttonBase =
    "text-xs transition-colors " +
    (isSidebar
      ? "flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      : "inline-flex items-center gap-1 rounded-full px-2.5 py-1");

  const buttonActive = "bg-primary/10 font-medium text-primary";
  const buttonInactive = isSidebar
    ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
    : "bg-secondary text-muted-foreground hover:text-foreground";

  const handleRoleClick = (roleId: string) => {
    onFilter(filterRoleId === roleId ? null : roleId);
  };

  const sidebarContent = (
    <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onFilter(null)}
            className={`${buttonBase} ${
              !filterRoleId ? buttonActive : buttonInactive
            }`}
          >
            All Roles
          </button>
          <div
            className={`flex flex-col gap-0.5 ${
              roles.length > 5
                ? "max-h-32 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                : ""
            }`}
          >
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleClick(r.id)}
                className={`${buttonBase} ${
                  filterRoleId === r.id ? buttonActive : buttonInactive
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
  );

  if (isSidebar) {
    if (hideHeader) {
      return <div className="min-w-0">{sidebarContent}</div>;
    }
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filter by Role
          </h3>
          {filterRoleId && (
            <button
              type="button"
              onClick={() => onFilter(null)}
              className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear role filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {sidebarContent}
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap gap-1.5 lg:hidden">
      <button
        type="button"
        onClick={() => onFilter(null)}
        className={`${buttonBase} ${
          !filterRoleId ? buttonActive : buttonInactive
        }`}
      >
        All Roles
      </button>
      {roles.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => handleRoleClick(r.id)}
          className={`${buttonBase} ${
            filterRoleId === r.id ? buttonActive : buttonInactive
          }`}
        >
          {r.name}
        </button>
      ))}
    </div>
  );
}
