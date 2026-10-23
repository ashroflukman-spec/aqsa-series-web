"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { isAdminEmail } from "../../lib/admin";
import { useAuth } from "../AuthProvider";

type Counts = { users: number; history: number; tadabbur: number; currentAffairs: number };

export default function UserInsights() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [failed, setFailed] = useState(false);

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

  return (
    <section className="mb-8 rounded-3xl border border-[#D4AF37]/20 bg-white/5 p-5" aria-label="Statistik pendengar">
      <h2 className="text-base font-semibold">Statistik pendengar</h2>
      <p className="mt-1 text-xs text-gray-400">Akaun dan topik pilihan; bilangan topik boleh bertindih.</p>
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
      <a href="https://console.firebase.google.com/project/aqsa-siries/analytics/dashboard" target="_blank" rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-[#E8D28A] underline-offset-4 hover:underline">
        Lihat laporan penggunaan di Firebase Analytics ↗
      </a>
      <p className="text-[11px] leading-5 text-gray-500">Peristiwa penggunaan direkodkan hanya apabila pendengar mengaktifkan pilihan statistik dalam Tetapan.</p>
    </section>
  );
}
