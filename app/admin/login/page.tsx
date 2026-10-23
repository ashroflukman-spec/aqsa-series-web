"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { useAuth } from "../../../components/AuthProvider";
import { isAdminEmail } from "../../../lib/admin";

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && isAdminEmail(user?.email)) {
      router.push("/admin");
    }
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!isAdminEmail(auth.currentUser?.email)) {
        setError("Akaun ini tidak mempunyai akses admin.");
        return;
      }
      router.push("/admin");
    } catch {
      setError("E-mel atau kata laluan tidak sepadan. Jika anda menggunakan akaun Google, pilih Teruskan dengan Google.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setSubmitting(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);

      if (!isAdminEmail(result.user.email)) {
        setError("Akaun Google ini tidak mempunyai akses admin. Pilih akaun admin yang ditetapkan.");
        return;
      }

      router.replace("/admin");
    } catch (cause) {
      const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      setError(code === "auth/popup-blocked"
        ? "Tetingkap Google disekat. Benarkan pop-up untuk laman ini dan cuba lagi."
        : code === "auth/network-request-failed"
          ? "Sambungan internet terganggu. Cuba lagi."
          : code === "auth/operation-not-allowed"
            ? "Log masuk Google belum tersedia."
            : "Log masuk Google gagal. Sila cuba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0f1115] text-white flex justify-center items-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-sm text-gray-400 mt-2">
            Masuk untuk akses dashboard Aqsa Series
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-[#17191e] transition-colors hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.42-.18-2.1H12v3.97h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.36l-3.24-2.52c-.9.6-2.05.96-3.4.96-2.61 0-4.83-1.76-5.62-4.13H3.04v2.6A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.38 13.95a6.01 6.01 0 0 1 0-3.9v-2.6H3.04a10 10 0 0 0 0 9.1l3.34-2.6Z" />
            <path fill="#EA4335" d="M12 5.92c1.43 0 2.71.49 3.72 1.45l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.34 2.6C7.17 7.68 9.39 5.92 12 5.92Z" />
          </svg>
          {submitting ? "Sedang log masuk..." : "Teruskan dengan Google"}
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-gray-500" aria-hidden="true">
          <span className="h-px flex-1 bg-white/10" />
          <span>ATAU</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Admin"
            className="w-full rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-500"
          />

          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl bg-[#14161b] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-500"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-[#7A1F2B] px-4 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "Sedang login..." : "Login"}
          </button>
        </form>

        {error && (
          <div role="alert" className="mt-4 rounded-2xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
