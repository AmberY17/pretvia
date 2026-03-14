import { cookies } from "next/headers"
import { AdminLoginPage } from "@/components/admin/admin-login-page"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return <AdminLoginPage />
  }

  const cookieStore = await cookies()
  const session = cookieStore.get("admin_session")?.value
  if (session !== adminSecret) {
    return <AdminLoginPage />
  }

  return <>{children}</>
}
