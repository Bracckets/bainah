"use client";

import { Insight } from "@/types/dataset";

interface Props {
  insights: Insight[];
  source?: "ai" | "rules" | "loading";
  providerLabel?: string;
}

const SEVERITY_STYLE: Record<string, { border: string; icon: string }> = {
  highlight: { border: "var(--accent)", icon: "AI" },
  warning: { border: "var(--warn)", icon: "!" },
  info: { border: "var(--muted)", icon: "i" },
};

export default function InsightsPanel({
  insights,
  source,
  providerLabel,
}: Props) {
  const aiLabel = providerLabel ?? "AI";

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-head">
        <div>
          <p className="panel-kicker">Insights</p>
          <h2 className="panel-title">Generated findings</h2>
        </div>
        <div className="insights-header">
          {source === "loading" && (
            <span className="insights-badge insights-badge--loading">
              <span className="insights-spinner" /> Waiting for {aiLabel}
            </span>
          )}
          {source === "ai" && (
            <span className="insights-badge insights-badge--ai">
              AI via {aiLabel}
            </span>
          )}
          {source === "rules" && (
            <span className="insights-badge insights-badge--rules">Rule-based</span>
          )}
        </div>
      </div>

      <p className="section-sub">
        {source === "ai"
          ? `These findings were generated with ${aiLabel} through the app proxy and grounded in the dataset statistics already shown in the workspace.`
          : source === "loading"
            ? `Rule-based findings remain visible while ${aiLabel} processes the same dataset summary through the app proxy.`
            : "These findings are generated directly from the current dataset statistics and analysis rules."}
      </p>

      <div className="insights-grid">
        {insights.map((insight) => {
          const style = SEVERITY_STYLE[insight.severity];
          return (
            <div
              key={insight.id}
              className="insight-card"
              style={{ borderLeftColor: style.border }}
            >
              <span className="insight-icon" style={{ color: style.border }}>
                {style.icon}
              </span>
              <div>
                <p className="insight-title">{insight.title}</p>
                <p className="insight-body">{insight.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
