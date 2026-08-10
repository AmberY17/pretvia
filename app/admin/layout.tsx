import { verifyAdminSession } from "@/lib/admin-auth"
import { AdminLoginPage } from "@/components/admin/admin-login-page"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await verifyAdminSession())) {
    return <AdminLoginPage />
  }

  return <>{children}</>
}
