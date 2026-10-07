import type { AppLanguage } from "../components/LanguageProvider";

type Translation = { title?: string; description?: string };
type TranslationPair = { en: Translation; ar: Translation };

export type TranslatableContent = {
  id: string;
  title: string;
  description?: string;
  translations?: Partial<Record<"en" | "ar", Translation>>;
};

// Editorial translations of Aqsa Series metadata. These are not translations
// of Quranic verses, scholarly tafsir, or the original audio recordings.
const SERIES_TRANSLATIONS: Record<string, TranslationPair> = {
  "al-ma-thurat": {
    en: {
      title: "Al-Ma’thurat",
      description: "This Al-Ma’thurat series brings together selected remembrances to enliven mornings and evenings with the remembrance of Allah. Make it a daily practice for peace of heart, protection, and strength of spirit through life's challenges.",
    },
    ar: {
      title: "المأثورات",
      description: "تجمع سلسلة المأثورات أذكارًا مختارة لإحياء الصباح والمساء بذكر الله. اجعلها عادة يومية لطمأنينة القلب وحفظ النفس وتقوية الروح في مواجهة تحديات الحياة.",
    },
  },
  "israel-bukan-sebuah-negara": {
    en: {
      title: "ISRAEL IS NOT A STATE?",
      description: "This series presents the reality of the Israeli entity.",
    },
    ar: {
      title: "إسرائيل ليست دولة؟",
      description: "تستعرض هذه السلسلة حقيقة الكيان الإسرائيلي.",
    },
  },
  "perancangan-strategik-untuk-pembebasan-salah-satu-cara-utama-membela-nabi-s-a-w": {
    en: {
      title: "STRATEGIC PLANNING FOR LIBERATION: A Key Way to Defend the Prophet ﷺ",
      description: "The book Strategic Planning for Liberation argues that defending the Messenger of Allah ﷺ calls for knowledge-based strategic action, rather than an emotional reaction alone. The author stresses the role of scholars in building a roadmap of knowledge as a foundation for the liberation of Baitulmaqdis, placing intellectual preparation before political and military efforts. Through historical analysis and a geopolitical framework, the work presents Baitulmaqdis as an indicator of the ummah's renewal and calls for a broad shift in strategic thinking.",
    },
    ar: {
      title: "التخطيط الاستراتيجي للتحرير: سبيل رئيسي لنصرة النبي ﷺ",
      description: "يوضح كتاب «التخطيط الاستراتيجي للتحرير» أن نصرة رسول الله ﷺ تقتضي عملًا استراتيجيًا قائمًا على العلم، لا مجرد رد فعل عاطفي. ويؤكد المؤلف دور العلماء في بناء خارطة طريق معرفية أساسًا لتحرير بيت المقدس، مع تقديم الإعداد الفكري على الجهود السياسية والعسكرية. ومن خلال تحليل تاريخي وإطار جيوسياسي، يبرز العمل بيت المقدس مؤشرًا على نهضة الأمة ويدعو إلى تحول شامل في التفكير الاستراتيجي.",
    },
  },
  "surah-al-isra-seruan-langit-untuk-membebaskan-al-aqsa": {
    en: {
      title: "Surah Al-Isra’: A Heavenly Call to Liberate Al-Aqsa",
      description: "This work explores Surah al-Isra’ as a foundation for understanding the place of Masjid al-Aqsa and Baitulmaqdis within revelation, the Prophetic tradition, and the responsibility of the Muslim community. It presents al-Aqsa as more than a historical or political issue: part of the Prophetic mission, connected to the Prophet's ﷺ Night Journey, the legacy of the prophets, and the community's responsibility to pursue liberation according to the Prophet's ﷺ way. The discussion combines scholarship and reflection, emphasizing the renewal of the soul, thought, and unity of the community.",
    },
    ar: {
      title: "سورة الإسراء: نداء من السماء لتحرير الأقصى",
      description: "يتناول هذا العمل سورة الإسراء بوصفها أساسًا لفهم مكانة المسجد الأقصى وبيت المقدس في إطار الوحي والسنة وأمانة الأمة. ويعرض الأقصى باعتباره أكثر من قضية تاريخية أو سياسية؛ فهو جزء من الرسالة النبوية، مرتبط بإسراء النبي ﷺ وإرث الأنبياء ومسؤولية الأمة عن مواصلة طريق التحرير وفق منهج النبي ﷺ. ويجمع الطرح بين المعرفة والتأمل، مؤكدًا تجديد النفس والفكر ووحدة الأمة.",
    },
  },
};

const REPEATED_COMMUNITY_DESCRIPTION = {
  en: "This episode discusses the foundations of a God-conscious society: monotheism, kindness to parents, responsibility for wealth, protection of dignity, social justice, the ethics of knowledge, and humility. It emphasizes that the liberation of Al-Aqsa calls for a community of strong character, pure hearts, and well-ordered personal and social lives.",
  ar: "تناقش هذه الحلقة أسس بناء مجتمع رباني: التوحيد، وبر الوالدين، وأمانة المال، وصون الكرامة، والعدل الاجتماعي، وأدب العلم، والتواضع. وتؤكد أن تحرير الأقصى يحتاج إلى أمة راسخة الأخلاق، نقية النفوس، ومنظمة الحياة الفردية والاجتماعية.",
};

const REPEATED_FAITH_DESCRIPTION = {
  en: "This episode guides listeners through the purification of belief, the reality of Satan's deception, the hardness of the human heart, and the need to rely completely on Allah. It emphasizes that the struggle to liberate Al-Aqsa requires steadfast souls, guarded speech, and living conviction in the Hereafter.",
  ar: "تصحب هذه الحلقة المستمع في تأمل تطهير العقيدة، وحقيقة خداع الشيطان، وقسوة قلب الإنسان، والحاجة إلى الاعتماد الكامل على الله. وتؤكد أن السعي لتحرير الأقصى يحتاج إلى نفوس ثابتة، وألسنة منضبطة، ويقين حي بالآخرة.",
};

const EPISODE_DESCRIPTIONS: Record<string, { en: string; ar: string }> = {
  "3I6VuFshHrlfIn35rGUl": {
    en: "The future of the buffer state/Israel",
    ar: "مستقبل الدولة العازلة/إسرائيل",
  },
  "7fjDfvnOkTCVjk38dhrp": REPEATED_COMMUNITY_DESCRIPTION,
  "8XQzQ5rkmSG1s9Fxzz3u": {
    en: "Two major parts of the Western colonial project in the Arab world",
    ar: "الجزآن الرئيسيان للمشروع الاستعماري الغربي في العالم العربي",
  },
  "F6vZhismiscCs1XNEHdX": REPEATED_FAITH_DESCRIPTION,
  "Frot6hoYd6xpppLWNJyl": {
    en: "The aims of the Western colonial project in the Arab world",
    ar: "أهداف المشروع الاستعماري الغربي في العالم العربي",
  },
  "V2ttQ2RjZUWlSwwB3MJX": {
    en: "This episode highlights the formation of the soul as a foundation for the community's renewal: moving beyond haste, living by the discipline of revelation, taking responsibility for one's actions, understanding the rise and fall of civilizations, and prioritizing the Hereafter. Together, these qualities prepare people to answer the heavenly call to liberate Al-Aqsa.",
    ar: "تسلط هذه الحلقة الضوء على بناء النفس أساسًا لنهضة الأمة: تجاوز العجلة، والعيش بانضباط الوحي، وتحمل مسؤولية العمل، وفهم أسباب صعود الحضارات وسقوطها، وتقديم الآخرة. وتُكوّن هذه المعاني إنسانًا مؤهلًا للاستجابة للنداء السماوي لتحرير الأقصى.",
  },
  "W2a5Tj07vhCuvWX2kHqH": {
    en: "This episode explores verses 1–10 of Surah al-Isra’ as an opening roadmap for the liberation of Al-Aqsa: the dignity of the holy land, the danger of corruption and arrogance, the need for monotheism and gratitude, and the affirmation that the Quran offers the straightest path for building a community capable of carrying the trust of Baitulmaqdis.",
    ar: "تتناول هذه الحلقة الآيات 1–10 من سورة الإسراء بوصفها خارطة طريق أولية لتحرير الأقصى: كرامة الأرض المقدسة، وخطر الفساد والكبر، والحاجة إلى التوحيد والشكر، والتأكيد أن القرآن يهدي إلى الطريق الأقوم لبناء أمة قادرة على حمل أمانة بيت المقدس.",
  },
  "oAFovUGk68Kjo4Zf8aqw": REPEATED_FAITH_DESCRIPTION,
  "pmgSSlpue2QNv47YEqfy": {
    en: "This episode presents Surah al-Isra’ as a call of revelation linking the dignity of Al-Aqsa with the Prophet's ﷺ path of struggle. It emphasizes that the liberation of Baitulmaqdis begins not with emotion alone, but with building faith, knowledge, character, unity, and fidelity to the Prophetic way.",
    ar: "تعرض هذه الحلقة سورة الإسراء بوصفها نداءً من الوحي يربط مكانة الأقصى بسنة النبي ﷺ في السعي. وتؤكد أن تحرير بيت المقدس لا يبدأ بالعاطفة وحدها، بل ببناء الإيمان والعلم والأخلاق والوحدة والالتزام بمنهج النبي.",
  },
  "s2RMOmF31mt4ev3Hhszl": REPEATED_COMMUNITY_DESCRIPTION,
  "usZVKR9CpfawDMDPxmRz": {
    en: "The roots of the Western colonial project in the Arab world",
    ar: "جذور المشروع الاستعماري الغربي في العالم العربي",
  },
  "yjPaYeqvM7UBh78t5QTJ": {
    en: "This episode explores Iblis's hostility toward humanity, the danger of arrogance, and the need to close the doors to Satan in the life of the community. It also recalls the dignity of the children of Adam as a foundation for responsibility, hope, and renewal on the path toward the liberation of Al-Aqsa.",
    ar: "تتناول هذه الحلقة عداوة إبليس للإنسان، وخطر الكبر، وضرورة إغلاق أبواب الشيطان في حياة الأمة. كما تذكّر بكرامة بني آدم أساسًا للأمانة والأمل والنهضة في الطريق نحو تحرير الأقصى.",
  },
};

const EPISODE_TITLES: Record<string, { en: string; ar: string }> = {
  "AG90XQzwH6jtJVqfS6KZ": { en: "The Role of Scholars: Building a Strategic Plan for Liberation", ar: "دور العلماء: بناء خطة استراتيجية للتحرير" },
  "G7xk6FOP9Gz1XMDjHqvK": { en: "The Role of the Community in History", ar: "دور الأمة في التاريخ" },
  "PJGqTXdtiaZSNDFKkERY": { en: "Baitulmaqdis as a Barometer of the Ummah and a Source of Global Renewal", ar: "بيت المقدس مقياسًا لحال الأمة ومصدرًا للنهضة العالمية" },
  "oge5s7OraJjLggocJS9I": { en: "Why Scholars Must Draw a Roadmap of Knowledge", ar: "أهمية رسم العلماء خارطة طريق معرفية" },
};

const EPISODE_PARTS: Record<string, { en: string; ar: string }> = {
  Pendahuluan: { en: "Introduction", ar: "المقدمة" },
  "Bahagian Pertama": { en: "Part One", ar: "الجزء الأول" },
  "Bahagian Kedua": { en: "Part Two", ar: "الجزء الثاني" },
  "Bahagian Ketiga": { en: "Part Three", ar: "الجزء الثالث" },
  "Bahagian Keempat": { en: "Part Four", ar: "الجزء الرابع" },
  Epilog: { en: "Epilogue", ar: "الخاتمة" },
};

function seededEpisodeTitle(id: string, title: string, language: "en" | "ar") {
  const specific = EPISODE_TITLES[id];
  if (specific) return specific[language];

  const surahVerses = title.match(/^Tadabbur Surah Al-Isra' : Ayat (\d+)-(\d+)$/);
  if (surahVerses) {
    const range = `${surahVerses[1]}–${surahVerses[2]}`;
    return language === "en"
      ? `Reflection on Surah Al-Isra’: Verses ${range}`
      : `تدبر سورة الإسراء: الآيات ${range}`;
  }

  if (title === "Tadabbur Surah Al-Isra' : Pendahuluan") {
    return language === "en"
      ? "Reflection on Surah Al-Isra’: Introduction"
      : "تدبر سورة الإسراء: المقدمة";
  }

  if (title === "Tadabbur Surah Al-Isra' : Penutup Ayat 105-111") {
    return language === "en"
      ? "Reflection on Surah Al-Isra’: Closing, Verses 105–111"
      : "تدبر سورة الإسراء: الخاتمة، الآيات 105–111";
  }

  const mathuratPart = title.match(/^Al-Ma’thurat Bahagian ([12])$/);
  if (mathuratPart) {
    return language === "en"
      ? `Al-Ma’thurat Part ${mathuratPart[1]}`
      : `المأثورات، الجزء ${mathuratPart[1]}`;
  }

  return EPISODE_PARTS[title]?.[language];
}

export function localizeContent(
  kind: "series" | "episode",
  item: TranslatableContent,
  language: AppLanguage,
) {
  if (language === "ms") {
    return {
      title: item.title,
      description: item.description ?? "",
      titleTranslated: true,
      descriptionTranslated: true,
    };
  }

  const fromDatabase = item.translations?.[language];
  const seeded = kind === "series" ? SERIES_TRANSLATIONS[item.id]?.[language] : undefined;
  const seededTitle = kind === "episode" ? seededEpisodeTitle(item.id, item.title, language) : seeded?.title;
  const seededDescription = kind === "episode" ? EPISODE_DESCRIPTIONS[item.id]?.[language] : seeded?.description;
  const translatedTitle = fromDatabase?.title?.trim() || seededTitle;
  const translatedDescription = fromDatabase?.description?.trim() || seededDescription;

  return {
    title: translatedTitle || item.title,
    description: translatedDescription || item.description || "",
    titleTranslated: Boolean(translatedTitle),
    descriptionTranslated: !item.description || Boolean(translatedDescription),
  };
}
