# BAINAH | بيّنة — AI Dataset Insight Generator

> *بيّنة* (Bayyinah) — Arabic for "clear evidence" or "proof." Upload a CSV. Receive instant clarity.

A lightweight, portfolio-quality AI data analysis product built with **Next.js 14**, **TypeScript**, and **Recharts**. All analysis runs **entirely in the browser** — no backend, no API keys, no cost to run.

---

## Screenshot

```
┌─────────────────────────────────────────────────────┐
│  بيّنة | BAINAH      AI Dataset Insight Generator   │
├─────────────────────────────────────────────────────┤
│  [ Upload Dataset ]  ← drag & drop CSV              │
│  Dataset Overview  — rows · columns · types         │
│  Visualisations    — histograms · bars · heatmap    │
│  AI-Generated Insights — rule-based findings        │
│  Anomalies Detected — Z-score flagging              │
└─────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| **CSV Upload** | Drag-and-drop or click to upload. Parsed entirely in-browser via PapaParse. |
| **Dataset Overview** | Row count, column count, type breakdown, missing value counts. |
| **Column Type Detection** | Auto-detects Numeric, Categorical, Datetime, or Text using heuristics. |
| **Statistical Analysis** | Mean, median, std dev, min/max for numeric; frequency distribution for categorical. |
| **Correlation Analysis** | Pearson correlation matrix for all numeric column pairs. Highlights |r| > 0.7. |
| **Automatic Visualisations** | Histograms, bar charts, correlation heatmap, scatter plots for strong correlations. |
| **Insight Generation** | Rule-based insights translated into plain English: correlations, skew, dominance, missing data. |
| **Anomaly Detection** | Z-score method flags any value where \|z\| > 3. Severity-ranked table. |

---

## Architecture

```
bainah/
├── app/
│   ├── layout.tsx          # Root layout + metadata
│   ├── page.tsx            # Main orchestration — state + analysis pipeline
│   └── globals.css         # Full design system (CSS variables, all styles)
│
├── components/
│   ├── UploadPanel.tsx     # Drag-and-drop CSV upload widget
│   ├── DatasetSummary.tsx  # Overview stats + column type table
│   ├── ChartsPanel.tsx     # All Recharts visualisations
│   ├── InsightsPanel.tsx   # Insight cards rendered from insight objects
│   └── AnomalyTable.tsx    # Z-score anomaly results table
│
├── lib/
│   ├── csvParser.ts        # PapaParse wrapper
│   ├── columnClassifier.ts # Heuristic type detection
│   ├── statisticsEngine.ts # mean/median/std/histogram/frequencies
│   ├── correlationEngine.ts# Pearson r for all numeric pairs
│   ├── insightGenerator.ts # Rule-based insight objects
│   └── anomalyDetector.ts  # Z-score flagging
│
└── types/
    └── dataset.ts          # Full TypeScript type definitions
```

### Analysis pipeline (all client-side)

```
File → parseCSV → classifyColumns → computeStats
                                  → computeCorrelations
                                  → generateInsights
                                  → detectAnomalies
                                  → render components
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Charts | Recharts 2 |
| CSV Parsing | PapaParse 5 |
| Statistics | Custom TypeScript utilities (no heavy deps) |
| Anomaly Detection | Z-score (no ML libraries) |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Local development

```bash
git clone https://github.com/YOUR_USERNAME/bainah.git
cd bainah
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment on Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Option B — Vercel Dashboard

1. Push this repo to GitHub / GitLab / Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your repository.
4. Leave all settings at defaults — Vercel auto-detects Next.js.
5. Click **Deploy**.

> **Cost:** \$0. All analysis is client-side. No serverless functions, no database, no API keys required.

---

## Example Datasets

Try these free CSVs:

- **Titanic** — [kaggle.com/c/titanic](https://www.kaggle.com/c/titanic/data) — mix of numeric + categorical
- **Iris** — classic, 150 rows, 4 numeric + 1 categorical column
- **World Happiness Report** — strong numeric correlations
- **NYC Airbnb** — anomaly detection works great here

---

## Performance

- Handles CSVs up to **10 MB** comfortably
- Analysis completes in **< 500ms** for most datasets
- No server round-trips — all computation in the browser via Web APIs
- Charts render lazily via Recharts' `ResponsiveContainer`

---

## Design System

Aesthetic: **refined dark editorial** — Arabic scholarly meets data terminal.

- **Display font:** DM Serif Display
- **Body/mono font:** IBM Plex Mono  
- **Arabic script:** Amiri
- **Accent colour:** Antique gold `#c9a96e`
- **Secondary accent:** Steel blue `#5b8db8`

---

## Contributing

PRs welcome. Please keep each analysis utility isolated in `lib/` and fully typed.

---

## License

MIT © 2024
