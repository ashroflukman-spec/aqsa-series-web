"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  collection, getCountFromServer, getDocs, limit, orderBy, query, startAfter, where,
  type DocumentData, type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { isAdminEmail } from "../../lib/admin";
import { useAuth } from "../AuthProvider";

type Counts = { users: number; history: number; tadabbur: number; currentAffairs: number };
type Account = { id: string; name: string; email: string; createdAt: number; interests: string[] };
const PAGE_SIZE = 20;
const INTEREST_LABELS: Record<string, string> = {
  history: "Sejarah",
  tadabbur: "Tadabbur",
  current_affairs: "Isu semasa",
};

export default function UserInsights() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [failed, setFailed] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [visitorFailed, setVisitorFailed] = useState(false);

  useEffect(() => {
    if (!isAdminEmail(user?.email)) return;
    let active = true;
    const users = collection(db, "users");
    void Promise.all([
      getCountFromServer(users),
      getCountFromServer(query(users, where("interests", "array-contains", "history"))),
      getCountFromServer(query(users, where("interests", "array-contains", "tadabbur"))),
      getCountFromServer(query(users, where("interests", "array-contains", "current_affairs"))),
    ]).then(([all, history, tadabbur, currentAffairs]) => {
      if (active) setCounts({
        users: all.data().count,
        history: history.data().count,
        tadabbur: tadabbur.data().count,
        currentAffairs: currentAffairs.data().count,
      });
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) return;
    let active = true;
    void user.getIdToken().then(async (token) => {
      const response = await fetch("/api/visitors", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Statistik pelawat tidak tersedia");
      const data = await response.json();
      if (active) setVisitorCount(typeof data.total === "number" ? data.total : 0);
    }).catch(() => { if (active) setVisitorFailed(true); });
    return () => { active = false; };
  }, [user]);

  async function loadAccounts(after: QueryDocumentSnapshot<DocumentData> | null = null) {
    if (!isAdminEmail(user?.email) || loadingAccounts) return;
    setLoadingAccounts(true);
    setAccountsError(false);
    try {
      const users = collection(db, "users");
      const snapshot = await getDocs(after
        ? query(users, orderBy("createdAt", "desc"), startAfter(after), limit(PAGE_SIZE + 1))
        : query(users, orderBy("createdAt", "desc"), limit(PAGE_SIZE + 1)));
      const visible = snapshot.docs.slice(0, PAGE_SIZE);
      const next = visible.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          name: typeof data.displayName === "string" ? data.displayName : "",
          email: typeof data.email === "string" ? data.email : "",
          createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
          interests: Array.isArray(data.interests) ? data.interests.filter((interest): interest is string => typeof interest === "string") : [],
        };
      });
      setAccounts((current) => after ? [...current, ...next] : next);
      setCursor(visible.at(-1) ?? null);
      setHasMore(snapshot.size > PAGE_SIZE);
    } catch {
      setAccountsError(true);
    } finally {
      setLoadingAccounts(false);
    }
  }

  function toggleAccounts() {
    const next = !accountsOpen;
    setAccountsOpen(next);
    if (next && accounts.length === 0) void loadAccounts();
  }

  return (
    <section className="mb-8 rounded-3xl border border-[#D4AF37]/20 bg-white/5 p-5" aria-label="Statistik pendengar">
      <h2 className="text-base font-semibold">Statistik pendengar</h2>
      <p className="mt-1 text-xs text-gray-400">Akaun yang telah membuat profil dan topik pilihan; bilangan topik boleh bertindih.</p>
      {failed ? <p className="mt-4 text-xs text-gray-400">Statistik akaun belum dapat dimuatkan.</p> : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {([
            ["Akaun berdaftar", counts?.users],
            ["Sejarah", counts?.history],
            ["Tadabbur", counts?.tadabbur],
            ["Isu semasa", counts?.currentAffairs],
          ] as const).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[#14161b] p-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-1 text-xl font-bold text-[#E8D28A]">{value ?? "—"}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-[#D4AF37]/20 bg-[#14161b] p-4">
        <p className="text-xs text-gray-400">Pelayar yang pernah membuka Aqsa Series</p>
        <p className="mt-1 text-2xl font-bold text-[#E8D28A]">{visitorFailed ? "—" : visitorCount ?? "—"}</p>
        <p className="mt-1 text-[11px] leading-5 text-gray-400">Termasuk pelawat tanpa log masuk. Anggaran satu kali bagi setiap pelayar, bermula selepas ciri ini diterbitkan; data pelayar yang dipadam boleh dikira semula.</p>
        {visitorFailed && <p className="mt-2 text-[11px] text-amber-200">Jumlah pelawat belum dapat dimuatkan.</p>}
      </div>

      <button type="button" onClick={toggleAccounts} aria-expanded={accountsOpen}
        className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] px-4 text-left text-sm font-semibold text-[#E8D28A]">
        Senarai akaun dan e-mel
        <ChevronDown size={17} className={`transition-transform ${accountsOpen ? "rotate-180" : ""}`} />
      </button>

      {accountsOpen && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] leading-5 text-gray-400">Nama dan e-mel hanya dipaparkan kepada admin. Alamat rumah tidak dikumpulkan oleh aplikasi.</p>
          {accounts.map((account) => (
            <div key={account.id} className="rounded-xl border border-white/10 bg-[#14161b] p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-white">{account.name || "Nama tidak tersedia"}</p>
                {isAdminEmail(account.email) && <span className="shrink-0 rounded-full border border-[#D4AF37]/30 px-2 py-0.5 text-[10px] text-[#E8D28A]">Admin</span>}
              </div>
              <p className="mt-1 break-all text-xs text-[#E8D28A]">{account.email || "E-mel tidak tersedia"}</p>
              <p className="mt-2 text-[11px] text-gray-400">
                {account.createdAt > 0 ? `Daftar ${new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "short", year: "numeric" }).format(account.createdAt)}` : "Tarikh daftar tidak tersedia"}
                {account.interests.length > 0 ? ` · ${account.interests.map((interest) => INTEREST_LABELS[interest] || interest).join(", ")}` : ""}
              </p>
            </div>
          ))}
          {accounts.length === 0 && !loadingAccounts && !accountsError && <p className="py-3 text-xs text-gray-400">Belum ada profil pendengar.</p>}
          {accountsError && <p role="alert" className="text-xs text-amber-200">Senarai akaun belum dapat dimuatkan. Cuba lagi.</p>}
          {(hasMore || accountsError || (accounts.length === 0 && loadingAccounts)) && (
            <button type="button" onClick={() => void loadAccounts(accountsError && accounts.length === 0 ? null : cursor)} disabled={loadingAccounts}
              className="min-h-11 w-full rounded-xl border border-white/10 px-3 text-xs font-semibold text-white disabled:opacity-50">
              {loadingAccounts ? "Memuatkan…" : accountsError ? "Cuba lagi" : "Muatkan lagi"}
            </button>
          )}
        </div>
      )}

      <a href="https://console.firebase.google.com/project/aqsa-siries/analytics/dashboard" target="_blank" rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-[#E8D28A] underline-offset-4 hover:underline">
        Lihat laporan penggunaan di Firebase Analytics ↗
      </a>
      <p className="text-[11px] leading-5 text-gray-500">Peristiwa penggunaan terperinci direkodkan hanya apabila pendengar mengaktifkan pilihan statistik dalam Tetapan.</p>
    </section>
  );
}
