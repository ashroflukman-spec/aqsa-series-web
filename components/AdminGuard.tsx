"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { isAdminEmail } from "../lib/admin";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isLoginPage = usePathname() === "/admin/login";

  useEffect(() => {
    if (!isLoginPage && !loading && !isAdminEmail(user?.email)) {
      router.push("/admin/login");
    }
  }, [user, loading, router, isLoginPage]);

  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f1115] text-white flex items-center justify-center">
        <p>Memuatkan...</p>
      </main>
    );
  }

  if (!isAdminEmail(user?.email)) {
    return null;
  }

  return <>{children}</>;
}
