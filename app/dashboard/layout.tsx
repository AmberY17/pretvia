/**
 * Dashboard layout - wraps all /dashboard/* routes.
 * Currently a pass-through; can add shared auth guard, nav, or wrapper later.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
