"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

export type AppLanguage = "ms" | "en" | "ar";

const STORAGE_KEY = "aqsa-language";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isAppLanguage(value: string | null): value is AppLanguage {
  return value === "ms" || value === "en" || value === "ar";
}

function preferredLanguage(): AppLanguage {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isAppLanguage(saved)) return saved;

  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith("ar")) return "ar";
  if (browserLanguage.startsWith("en")) return "en";
  return "ms";
}

export function LanguageProvider({ children, initialLanguage }: { children: React.ReactNode; initialLanguage: AppLanguage | null }) {
  const pathname = usePathname();
  const [language, updateLanguage] = useState<AppLanguage>(initialLanguage || "ms");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextLanguage = initialLanguage || preferredLanguage();
      updateLanguage(nextLanguage);
      localStorage.setItem(STORAGE_KEY, nextLanguage);
      document.cookie = `${STORAGE_KEY}=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialLanguage]);

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    document.documentElement.lang = isAdmin ? "ms" : language;
    document.documentElement.dir = !isAdmin && language === "ar" ? "rtl" : "ltr";
  }, [language, pathname]);

  function setLanguage(nextLanguage: AppLanguage) {
    updateLanguage(nextLanguage);
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    document.cookie = `${STORAGE_KEY}=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
