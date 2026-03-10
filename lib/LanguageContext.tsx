"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Language } from "@/lib/i18n";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const defaultValue: LanguageContextType = {
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
};

const LanguageContext = createContext<LanguageContextType>(defaultValue);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("language") as Language | null;
    if (savedLang && (savedLang === "en" || savedLang === "ar")) {
      setLangState(savedLang);
    }
    setMounted(true);
  }, []);

  // Update document dir and lang attributes
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      localStorage.setItem("language", lang);
    }
  }, [lang, mounted]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: any = translations[lang];

    for (const k of keys) {
      value = value[k];
      if (value === undefined) return key;
    }

    return value;
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  return context;
}

// Import translations locally for the provider
const translations = {
  en: {
    tagline: "AI Dataset Insight Generator",
    uploadTitle: "Upload Dataset",
    dragDrop: "Drag and drop your CSV here",
    orClick: "or click to select",
    fileType: "CSV files only",
    analysed: "Analysed",
    rows: "rows",
    columns: "columns",
    emptyError: "The CSV appears to be empty.",
    unknownError: "Unknown error occurred.",
    uploadPrompt: "Upload a CSV to begin instant analysis",
    features: {
      columnDetection: "Automatic column type detection",
      statistics: "Descriptive statistics & distributions",
      correlation: "Pearson correlation matrix",
      insights: "Rule-based insight generation",
      anomalies: "Z-score anomaly detection",
    },
    datasetSummary: "Dataset Summary",
    totalRows: "Total Rows",
    totalColumns: "Total Columns",
    columnType: "Column Type",
    name: "Name",
    type: "Type",
    uniqueValues: "Unique Values",
    missingValues: "Missing Values",
    statistics: "Statistics",
    charts: "Visualizations",
    insights: "Insights",
    anomalies: "Anomalies",
    footer:
      "BAINAH · بيّنة · AI Dataset Insight Generator · Built with Next.js & Recharts",
  },
  ar: {
    tagline: "مولّد رؤى مجموعات البيانات بالذكاء الاصطناعي",
    uploadTitle: "تحميل مجموعة البيانات",
    dragDrop: "اسحب ملف CSV هنا",
    orClick: "أو انقر للتحديد",
    fileType: "ملفات CSV فقط",
    analysed: "تم تحليل",
    rows: "صف",
    columns: "عمود",
    emptyError: "يبدو أن ملف CSV فارغ.",
    unknownError: "حدث خطأ غير معروف.",
    uploadPrompt: "قم بتحميل ملف CSV لبدء التحليل الفوري",
    features: {
      columnDetection: "الكشف التلقائي عن نوع العمود",
      statistics: "الإحصائيات الوصفية والتوزيعات",
      correlation: "مصفوفة ارتباط بيرسون",
      insights: "إنشاء رؤى قائمة على القواعد",
      anomalies: "كشف الشذوذ Z-score",
    },
    datasetSummary: "ملخص مجموعة البيانات",
    totalRows: "إجمالي الصفوف",
    totalColumns: "إجمالي الأعمدة",
    columnType: "نوع العمود",
    name: "الاسم",
    type: "النوع",
    uniqueValues: "القيم الفريدة",
    missingValues: "القيم المفقودة",
    statistics: "الإحصائيات",
    charts: "التصور البياني",
    insights: "الرؤى",
    anomalies: "الشذوذ",
    footer:
      "BAINAH · بيّنة · مولّد رؤى مجموعات البيانات بالذكاء الاصطناعي · تم البناء باستخدام Next.js و Recharts",
  },
};
