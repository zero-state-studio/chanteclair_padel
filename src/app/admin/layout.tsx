import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { headers } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isLoginPage = pathname.endsWith("/admin/login");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {session && !isLoginPage && <AdminNav />}
      <main>{children}</main>
    </div>
  );
}
