"use client";
// ─── InsightsPanel ───────────────────────────────────────────────────────────

import { Insight } from "@/types/dataset";

interface Props {
  insights: Insight[];
}

const SEVERITY_STYLE: Record<string, { border: string; icon: string }> = {
  highlight: { border: "var(--accent)", icon: "✦" },
  warning: { border: "var(--warn)", icon: "⚠" },
  info: { border: "var(--muted)", icon: "○" },
};

export default function InsightsPanel({ insights }: Props) {
  return (
    <section className="card">
      <h2 className="section-title">Generated Insights</h2>
      <p className="section-sub">
        Rule-based findings derived automatically from the dataset statistics.
      </p>
      <div className="insights-grid">
        {insights.map((ins) => {
          const sty = SEVERITY_STYLE[ins.severity];
          return (
            <div
              key={ins.id}
              className="insight-card"
              style={{ borderLeftColor: sty.border }}
            >
              <span className="insight-icon" style={{ color: sty.border }}>
                {sty.icon}
              </span>
              <div>
                <p className="insight-title">{ins.title}</p>
                <p className="insight-body">{ins.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
