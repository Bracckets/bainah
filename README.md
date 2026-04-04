# BAINAH | Bayyinah

> Bayyinah means "clear evidence" or "proof." Upload a CSV or XLSX file and move from raw rows to readable analysis in one workspace.

BAINAH is a lightweight data analysis app built with **Next.js**, **TypeScript**, and **Recharts**. Core parsing, profiling, charting, anomaly detection, and local baseline modeling run in the browser. Optional AI features use a hosted proxy and a **session-only bring-your-own-key flow**.

## What It Does

- Upload CSV or XLSX files
- Profile columns, missingness, and data types
- Explore focused charts one view at a time
- Review rule-based or AI-assisted insights
- Inspect anomalies and correlations
- Run a simple local baseline model with holdout evaluation
- Export a branded Bayynah PDF report

## Privacy And AI

BAINAH is **not** a fully local AI product in the hosted deployment.

- Core dataset analysis runs in the browser
- AI is optional
- If you connect an AI provider, your key is kept in memory for the current session only
- The app does **not** store your API key
- AI requests are forwarded through the app's hosted proxy to the provider you selected
- Dataset summaries sent for AI insight generation or prompt export also pass through that proxy
- If AI is unavailable, the app continues with rule-based insights

Short version: **analysis is local-first, AI is proxied, keys are session-only and not stored by the app**.

## Feature Highlights

| Feature | Description |
|---|---|
| File upload | Upload `.csv` and `.xlsx` files from the browser |
| Dataset overview | Rows, columns, missing values, and type breakdown |
| Data prep | Hide columns, override types, and apply simple missing-value handling |
| Statistical analysis | Numeric summaries, category frequencies, and correlations |
| Charts | Focused chart families for distributions, categories, and relationships |
| Insights | Rule-based findings, with optional AI-assisted narrative |
| Anomaly detection | Z-score based anomaly review |
| Modeling | Local holdout evaluation with baseline comparison |
| Reporting | Branded PDF report export for analyst or executive handoff |

## Architecture

```text
bainah/
├── app/
│   ├── page.tsx            # Main orchestration and analysis flow
│   ├── globals.css         # Design system and app styling
│   └── api/ai/route.ts     # Hosted AI proxy for optional provider calls
├── components/             # App UI and analysis views
├── lib/                    # Parsing, analysis, AI, prep, and report logic
└── types/                  # Shared TypeScript models
```

## Analysis Pipeline

```text
File
→ parse
→ classify columns
→ apply prep rules
→ compute stats
→ correlations
→ anomalies
→ insights
→ optional model baseline
→ render workspace
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js |
| Language | TypeScript |
| Charts | Recharts |
| CSV parsing | PapaParse |
| Excel parsing | read-excel-file |
| PDF export | pdf-lib |
| Deployment | Vercel |

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Run

```bash
git clone https://github.com/YOUR_USERNAME/bainah.git
cd bainah
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying

BAINAH is designed to deploy well on Vercel.

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Notes

- `.xls` is intentionally not supported; use `.xlsx` or `.csv`
- The hosted build uses security headers and a validated AI proxy, but BYO-key is still a trust-based hosted architecture
- For the best experience, desktop or iPad-sized screens are recommended

## License

MIT
