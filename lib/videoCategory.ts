import type { AppLanguage } from "../components/LanguageProvider";

const LABELS: Record<string, Record<AppLanguage, string>> = {
  Tadabbur: { ms: "Tadabbur", en: "Reflection", ar: "تدبر" },
  Wacana: { ms: "Wacana", en: "Discussions", ar: "حوارات" },
  Dokumentari: { ms: "Dokumentari", en: "Documentaries", ar: "وثائقيات" },
  "Aqsa for Kids": { ms: "Aqsa for Kids", en: "Aqsa for Kids", ar: "الأقصى للأطفال" },
  "Aqsa Ads": { ms: "Aqsa Ads", en: "Aqsa Ads", ar: "إعلانات الأقصى" },
  Umum: { ms: "Umum", en: "General", ar: "عام" },
  Muzik: { ms: "Muzik", en: "Music", ar: "موسيقى" },
  Filem: { ms: "Filem", en: "Films", ar: "أفلام" },
};

export function videoCategoryLabel(category: string, language: AppLanguage) {
  if (category === "All") return { ms: "Semua", en: "All", ar: "الكل" }[language];
  return LABELS[category]?.[language] || category;
}
