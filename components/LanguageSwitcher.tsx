"use client";

import { useLanguage } from "@/lib/LanguageContext";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="language-switcher">
      <button
        onClick={() => setLang("en")}
        className={`lang-btn ${lang === "en" ? "active" : ""}`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <span className="lang-sep">|</span>
      <button
        onClick={() => setLang("ar")}
        className={`lang-btn ${lang === "ar" ? "active" : ""}`}
        aria-label="Switch to Arabic"
      >
        AR
      </button>
    </div>
  );
}
