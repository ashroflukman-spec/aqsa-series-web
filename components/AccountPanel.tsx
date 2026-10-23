"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useAuth } from "./AuthProvider";
import { useAudio } from "./AudioProvider";
import { useLanguage } from "./LanguageProvider";
import { isAdminEmail } from "../lib/admin";
import { canSyncListening } from "../lib/listenerAccount";
import { trackUsageEvent } from "../lib/usageAnalytics";

type Interest = "history" | "tadabbur" | "current_affairs";
type Profile = { interests: Interest[]; createdAt: number };

const INTERESTS: Interest[] = ["history", "tadabbur", "current_affairs"];

const COPY = {
  ms: {
    title: "Akaun anda", guest: "Dengar tanpa akaun, atau simpan aktiviti merentas peranti.",
    google: "Teruskan dengan Google", later: "Anda boleh terus mendengar tanpa log masuk.",
    disclosure: "Nama dan email daripada Google digunakan untuk akaun dan penyegerakan. Tiada mesej promosi tanpa pilihan anda.",
    signedIn: "Aktiviti mendengar boleh disambung pada peranti lain.", signOut: "Log keluar",
    interests: "Topik pilihan", interestHelp: "Pilih sehingga 3 topik. Langkah ini pilihan.",
    history: "Sejarah", tadabbur: "Tadabbur", current_affairs: "Isu semasa",
    syncing: "Menyegerak aktiviti...", synced: "Aktiviti telah disegerakkan", syncError: "Penyegerakan tertangguh. Aktiviti masih disimpan pada peranti ini.",
    unavailable: "Log masuk Google belum tersedia. Sila cuba lagi nanti.",
    popup: "Tetingkap log masuk disekat. Benarkan pop-up untuk laman ini dan cuba lagi.",
    network: "Sambungan terganggu. Sila cuba lagi.",
    conflict: "Email ini sudah mempunyai kaedah log masuk lain. Gunakan kaedah asal untuk akaun ini.",
    failed: "Log masuk gagal. Sila cuba lagi.", saveFailed: "Pilihan belum dapat disimpan. Sila cuba lagi.",
    admin: "Admin",
    oldAccount: "Akaun lama ini tidak menyokong penyegerakan pendengar. Log keluar dan teruskan dengan Google.",
  },
  en: {
    title: "Your account", guest: "Listen without an account, or save activity across devices.",
    google: "Continue with Google", later: "You can keep listening without signing in.",
    disclosure: "Your Google name and email are used for your account and sync. No promotional messages without your choice.",
    signedIn: "Continue listening on another device.", signOut: "Sign out",
    interests: "Topics you like", interestHelp: "Choose up to 3 topics. This is optional.",
    history: "History", tadabbur: "Reflection", current_affairs: "Current affairs",
    syncing: "Syncing activity...", synced: "Activity synced", syncError: "Sync is delayed. Your activity remains on this device.",
    unavailable: "Google sign-in is not available yet. Please try again later.",
    popup: "The sign-in window was blocked. Allow pop-ups for this site and try again.",
    network: "Connection interrupted. Please try again.",
    conflict: "This email already uses another sign-in method. Use its original method.",
    failed: "Sign-in failed. Please try again.", saveFailed: "Could not save your choices. Please try again.",
    admin: "Admin",
    oldAccount: "This older account cannot sync listener activity. Sign out and continue with Google.",
  },
  ar: {
    title: "حسابك", guest: "استمع دون حساب، أو احفظ نشاطك عبر أجهزتك.",
    google: "المتابعة باستخدام Google", later: "يمكنك مواصلة الاستماع دون تسجيل الدخول.",
    disclosure: "يُستخدم الاسم والبريد الإلكتروني من Google لحسابك والمزامنة. لا رسائل ترويجية دون اختيارك.",
    signedIn: "تابع الاستماع على جهاز آخر.", signOut: "تسجيل الخروج",
    interests: "الموضوعات المفضلة", interestHelp: "اختر حتى ٣ موضوعات. هذه الخطوة اختيارية.",
    history: "التاريخ", tadabbur: "التدبر", current_affairs: "القضايا الراهنة",
    syncing: "جارٍ مزامنة النشاط...", synced: "تمت مزامنة النشاط", syncError: "تأخرت المزامنة. يبقى نشاطك محفوظًا على هذا الجهاز.",
    unavailable: "تسجيل الدخول عبر Google غير متاح بعد. حاول لاحقًا.",
    popup: "تم حظر نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة لهذا الموقع وحاول مجددًا.",
    network: "انقطع الاتصال. حاول مجددًا.",
    conflict: "يستخدم هذا البريد الإلكتروني طريقة دخول أخرى. استخدم الطريقة الأصلية.",
    failed: "تعذر تسجيل الدخول. حاول مجددًا.", saveFailed: "تعذر حفظ اختياراتك. حاول مجددًا.",
    admin: "المشرف",
    oldAccount: "هذا الحساب القديم لا يدعم مزامنة نشاط الاستماع. سجّل الخروج وتابع باستخدام Google.",
  },
} as const;

function isInterest(value: unknown): value is Interest {
  return typeof value === "string" && INTERESTS.includes(value as Interest);
}

function currentTimeMs(): number {
  return Date.now();
}

export default function AccountPanel() {
  const { user, loading } = useAuth();
  const { syncStatus, resetAudio } = useAudio();
  const { language } = useLanguage();
  const copy = COPY[language];
  const [profileState, setProfileState] = useState<{ uid: string; profile: Profile } | null>(null);
  const profile = profileState && profileState.uid === user?.uid ? profileState.profile : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canSyncListening(user)) return;
    let active = true;
    const profileRef = doc(db, "users", user.uid);
    void (async () => {
      try {
        const snapshot = await getDoc(profileRef);
        if (!active) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfileState({ uid: user.uid, profile: {
            interests: Array.isArray(data.interests) ? data.interests.filter(isInterest) : [],
            createdAt: typeof data.createdAt === "number" ? data.createdAt : currentTimeMs(),
          } });
        } else {
          const createdAt = currentTimeMs();
          await setDoc(profileRef, {
            displayName: user.displayName?.slice(0, 120) || "",
            email: user.email || "",
            interests: [],
            createdAt,
            updatedAt: createdAt,
          });
          if (active) setProfileState({ uid: user.uid, profile: { interests: [], createdAt } });
        }
      } catch {
        if (active) setError(copy.saveFailed);
      }
    })();
    return () => { active = false; };
  }, [user, copy.saveFailed]);

  async function handleGoogleSignIn() {
    setError("");
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      void trackUsageEvent("aqsa_sign_in", { method: "google" });
    } catch (cause) {
      const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      setError(code === "auth/operation-not-allowed" ? copy.unavailable
        : code === "auth/popup-blocked" ? copy.popup
        : code === "auth/network-request-failed" ? copy.network
        : code === "auth/account-exists-with-different-credential" ? copy.conflict
        : copy.failed);
    } finally {
      setBusy(false);
    }
  }

  async function toggleInterest(interest: Interest) {
    if (!user || !profile || busy) return;
    const next = profile.interests.includes(interest)
      ? profile.interests.filter((item) => item !== interest)
      : profile.interests.length < 3 ? [...profile.interests, interest] : profile.interests;
    if (next === profile.interests) return;
    setError("");
    setBusy(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        displayName: user.displayName?.slice(0, 120) || "",
        email: user.email || "",
        interests: next,
        createdAt: profile.createdAt,
        updatedAt: currentTimeMs(),
      });
      setProfileState({ uid: user.uid, profile: { ...profile, interests: next } });
    } catch {
      setError(copy.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#1f232b] p-5" aria-label={copy.title}>
      <p className="text-sm font-semibold text-[#E8D28A]">{copy.title}</p>
      {!loading && user ? (
        <>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.displayName || user.email}</p>
              <p className="truncate text-xs text-gray-400">{user.email}</p>
              {canSyncListening(user) ? <p className="mt-2 text-xs text-gray-400">{copy.signedIn}</p> : null}
            </div>
            {isAdminEmail(user.email) ? <span className="rounded-full border border-[#D4AF37]/35 px-2 py-1 text-[10px] text-[#E8D28A]">{copy.admin}</span> : null}
          </div>
          {!canSyncListening(user) ? <p className="mt-3 text-xs leading-5 text-[#E8D28A]">{copy.oldAccount}</p> : null}
          {canSyncListening(user) ? <p className="mt-3 text-xs text-[#E8D28A]" role="status">
            {syncStatus === "syncing" ? copy.syncing : syncStatus === "error" ? copy.syncError : syncStatus === "ready" ? copy.synced : ""}
          </p> : null}
          {canSyncListening(user) ? <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-sm font-medium">{copy.interests}</p>
            <p className="mt-1 text-xs text-gray-400">{copy.interestHelp}</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={copy.interests}>
              {INTERESTS.map((interest) => (
                <button key={interest} type="button" disabled={!profile || busy} onClick={() => void toggleInterest(interest)}
                  aria-pressed={profile?.interests.includes(interest) || false}
                  className={`min-h-10 rounded-full border px-3 py-2 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8D28A] disabled:opacity-50 ${profile?.interests.includes(interest) ? "border-[#D4AF37]/60 bg-[#7A1F2B] text-white" : "border-white/15 bg-white/[0.04] text-white/75"}`}>
                  {copy[interest]}
                </button>
              ))}
            </div>
          </div> : null}
          <button type="button" onClick={() => { resetAudio(); void signOut(auth); }} className="mt-5 min-h-11 w-full rounded-xl border border-white/15 text-sm text-white/80 transition hover:bg-white/5">
            {copy.signOut}
          </button>
        </>
      ) : !loading ? (
        <>
          <p className="mt-2 text-xs leading-5 text-gray-400">{copy.guest}</p>
          <button type="button" disabled={busy} onClick={() => void handleGoogleSignIn()}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#7A1F2B] px-4 text-sm font-semibold text-white transition hover:bg-[#8d2936] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8D28A]">
            <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285F4]">G</span>
            {copy.google}
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">{copy.later}</p>
          <p className="mt-3 text-xs leading-5 text-gray-500">{copy.disclosure}</p>
        </>
      ) : null}
      {error ? <p className="mt-3 rounded-xl border border-red-500/25 bg-red-950/30 p-3 text-xs text-red-200" role="alert">{error}</p> : null}
    </section>
  );
}
