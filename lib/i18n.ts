// ─── i18n.ts — Internationalization system ────────────────────────────────

export type Language = 'en' | 'ar';

export const translations = {
  en: {
    // Header
    tagline: 'AI Dataset Insight Generator',

    // Upload section
    uploadTitle: 'Upload Dataset',
    dragDrop: 'Drag and drop your CSV here',
    orClick: 'or click to select',
    fileType: 'CSV files only',

    // Messages
    analysed: 'Analysed',
    rows: 'rows',
    columns: 'columns',
    emptyError: 'The CSV appears to be empty.',
    unknownError: 'Unknown error occurred.',

    // Empty state
    uploadPrompt: 'Upload a CSV to begin instant analysis',
    features: {
      columnDetection: 'Automatic column type detection',
      statistics: 'Descriptive statistics & distributions',
      correlation: 'Pearson correlation matrix',
      insights: 'Rule-based insight generation',
      anomalies: 'Z-score anomaly detection',
    },

    // Dataset summary
    datasetSummary: 'Dataset Summary',
    totalRows: 'Total Rows',
    totalColumns: 'Total Columns',
    columnType: 'Column Type',
    name: 'Name',
    type: 'Type',
    uniqueValues: 'Unique Values',
    missingValues: 'Missing Values',

    // Statistics
    statistics: 'Statistics',
    min: 'Min',
    max: 'Max',
    mean: 'Mean',
    median: 'Median',
    stdDev: 'Std Dev',
    q1: 'Q1',
    q3: 'Q3',

    // Charts
    charts: 'Visualizations',
    distribution: 'Distribution',
    histogram: 'Histogram',
    boxplot: 'Box Plot',

    // Insights
    insights: 'Insights',
    anomalies: 'Anomalies',

    // Footer
    footer: 'BAINAH · بيّنة · AI Dataset Insight Generator · Built with Next.js & Recharts',
  },
  ar: {
    // Header
    tagline: 'ِإكتشف بياناتك في ثواني', // "Discover your data in seconds"

    // Upload section
    uploadTitle: 'تحميل مجموعة البيانات',
    dragDrop: 'اسحب ملف CSV هنا',
    orClick: 'أو انقر للتحديد',
    fileType: 'ملفات CSV فقط',

    // Messages
    analysed: 'تم تحليل',
    rows: 'صف',
    columns: 'عمود',
    emptyError: 'يبدو أن ملف CSV فارغ.',
    unknownError: 'حدث خطأ غير معروف.',

    // Empty state
    uploadPrompt: 'قم بتحميل ملف CSV لبدء التحليل الفوري',
    features: {
      columnDetection: 'الكشف التلقائي عن نوع العمود',
      statistics: 'الإحصائيات الوصفية والتوزيعات',
      correlation: 'مصفوفة ارتباط بيرسون',
      insights: 'إنشاء رؤى قائمة على القواعد',
      anomalies: 'كشف الشذوذ Z-score',
    },

    // Dataset summary
    datasetSummary: 'ملخص مجموعة البيانات',
    totalRows: 'إجمالي الصفوف',
    totalColumns: 'إجمالي الأعمدة',
    columnType: 'نوع العمود',
    name: 'الاسم',
    type: 'النوع',
    uniqueValues: 'القيم الفريدة',
    missingValues: 'القيم المفقودة',

    // Statistics
    statistics: 'الإحصائيات',
    min: 'الحد الأدنى',
    max: 'الحد الأقصى',
    mean: 'المتوسط',
    median: 'الوسيط',
    stdDev: 'الانحراف المعياري',
    q1: 'الربع الأول',
    q3: 'الربع الثالث',

    // Charts
    charts: 'التصور البياني',
    distribution: 'التوزيع',
    histogram: 'مدرج بياني',
    boxplot: 'رسم الصندوق',

    // Insights
    insights: 'الرؤى',
    anomalies: 'الشذوذ',

    // Footer
    footer: 'BAINAH · بيّنة · مولّد رؤى مجموعات البيانات بالذكاء الاصطناعي · تم البناء باستخدام Next.js و Recharts',
  },
};

export const getTranslation = (lang: Language, key: string): string => {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    value = value[k];
    if (value === undefined) return key;
  }

  return value;
};
