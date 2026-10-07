import AdminGuard from "../../components/AdminGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div lang="ms" dir="ltr"><AdminGuard>{children}</AdminGuard></div>;
}
