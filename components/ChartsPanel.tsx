"use client";
// ─── ChartsPanel ─────────────────────────────────────────────────────────────

import { ParsedDataset, NumericStats, CategoricalStats } from "@/types/dataset";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  Cell,
} from "recharts";

interface Props {
  dataset: ParsedDataset;
}

export default function ChartsPanel({ dataset }: Props) {
  const numericCols = dataset.columns.filter((c) => c.type === "numeric");
  const catCols = dataset.columns.filter((c) => c.type === "categorical");
  const strongCorrs = dataset.correlations
    .filter((c) => Math.abs(c.r) >= 0.7 && c.significant)
    .slice(0, 3);

  return (
    <section className="card">
      <h2 className="section-title">Visualisations</h2>

      {/* Histograms */}
      {numericCols.length > 0 && (
        <div>
          <h3 className="sub-title">
            Numeric Distributions (Freedman-Diaconis bins)
          </h3>
          <div className="chart-grid">
            {numericCols.slice(0, 6).map((col) => {
              const s = dataset.stats[col.name] as NumericStats;
              if (!s) return null;
              return (
                <div key={col.name} className="chart-card">
                  <p className="chart-label">{col.name}</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={s.histogram}
                      margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
                    >
                      <XAxis
                        dataKey="bin"
                        tick={{ fontSize: 9, fill: "var(--muted)" }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface2)",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 11,
                          color: "#ffffff",
                        }}
                        labelStyle={{ color: "#ffffff" }}
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--accent)"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="chart-meta">
                    μ={s.mean.toFixed(2)} · σ={s.std.toFixed(2)} · skew={s.skewness.toFixed(2)} · kurt={s.kurtosis.toFixed(2)}
                  </p>
                  <p className="chart-meta">
                    Q1={s.q1.toFixed(2)} · Q3={s.q3.toFixed(2)} · IQR={s.iqr.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bar charts for categorical */}
      {catCols.length > 0 && (
        <div>
          <h3 className="sub-title">Category Frequencies</h3>
          <div className="chart-grid">
            {catCols.slice(0, 4).map((col) => {
              const s = dataset.stats[col.name] as CategoricalStats;
              if (!s) return null;
              return (
                <div key={col.name} className="chart-card">
                  <p className="chart-label">{col.name}</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={s.frequencies.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="value"
                        tick={{ fontSize: 9, fill: "var(--muted)" }}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface2)",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 11,
                          color: "#ffffff",
                        }}
                        labelStyle={{ color: "#ffffff" }}
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--accent2)"
                        radius={[0, 3, 3, 0]}
                      >
                        {s.frequencies.slice(0, 10).map((_, i) => (
                          <Cell key={i} opacity={1 - i * 0.06} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="chart-meta">
                    H = {s.entropy.toFixed(2)} bits entropy
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Correlation Heatmap */}
      {dataset.correlations.length > 0 && (
        <div>
          <h3 className="sub-title">
            Correlation Matrix (Pearson r — significant pairs marked *)
          </h3>
          <CorrelationHeatmap dataset={dataset} />
        </div>
      )}

      {/* Scatter plots for strong significant correlations */}
      {strongCorrs.length > 0 && (
        <div>
          <h3 className="sub-title">
            Scatter Plots — Strong Significant Correlations
          </h3>
          <div className="chart-grid">
            {strongCorrs.map(({ colA, colB, r, pValue, n }) => {
              const pairs = dataset.rows
                .map((row) => ({
                  x: parseFloat(row[colA]?.replace(/,/g, "") ?? ""),
                  y: parseFloat(row[colB]?.replace(/,/g, "") ?? ""),
                }))
                .filter((p) => isFinite(p.x) && isFinite(p.y))
                .slice(0, 300);
              return (
                <div key={`${colA}-${colB}`} className="chart-card">
                  <p
                    className="chart-label"
                    style={{
                      whiteSpace: "normal",
                      overflow: "visible",
                      textOverflow: "unset",
                    }}
                  >
                    {colA} vs {colB}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--accent)",
                      marginTop: "-0.35rem",
                      marginBottom: "0.25rem",
                      fontWeight: 500,
                    }}
                  >
                    r = {r.toFixed(2)}
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "var(--muted)",
                      marginTop: 0,
                      marginBottom: "0.5rem",
                    }}
                  >
                    p = {pValue < 0.001 ? "< 0.001" : pValue.toFixed(3)} · n = {n}
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <ScatterChart
                      margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="x"
                        name={colA}
                        tick={{ fontSize: 9, fill: "var(--muted)" }}
                        tickLine={false}
                      />
                      <YAxis
                        dataKey="y"
                        name={colB}
                        tick={{ fontSize: 9, fill: "var(--muted)" }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface2)",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                        itemStyle={{
                          color: "var(--accent)",
                        }}
                        labelStyle={{ color: "#ffffff" }}
                        cursor={{ strokeDasharray: "3 3" }}
                      />
                      <Scatter
                        data={pairs}
                        fill="var(--accent)"
                        opacity={0.6}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Inline correlation heatmap ─────────────────────────────────────────────────

function CorrelationHeatmap({ dataset }: { dataset: ParsedDataset }) {
  const numericCols = dataset.columns
    .filter((c) => c.type === "numeric")
    .map((c) => c.name);
  if (numericCols.length < 2) return null;

  const corrMap: Record<string, { r: number; significant: boolean }> = {};
  dataset.correlations.forEach(({ colA, colB, r, significant }) => {
    corrMap[`${colA}::${colB}`] = { r, significant };
    corrMap[`${colB}::${colA}`] = { r, significant };
  });
  const get = (a: string, b: string) =>
    a === b
      ? { r: 1, significant: true }
      : (corrMap[`${a}::${b}`] ?? { r: 0, significant: false });

  const color = (r: number) => {
    if (r >= 1) return "#c9a96e";
    if (r > 0.7) return "#4ade80";
    if (r > 0.3) return "#86efac";
    if (r < -0.7) return "#f87171";
    if (r < -0.3) return "#fca5a5";
    return "var(--surface2)";
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="heatmap">
        <thead>
          <tr>
            <th></th>
            {numericCols.map((c) => (
              <th key={c} className="hm-header">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {numericCols.map((rowCol) => (
            <tr key={rowCol}>
              <td className="hm-row-label">{rowCol}</td>
              {numericCols.map((colCol) => {
                const { r, significant } = get(rowCol, colCol);
                return (
                  <td
                    key={colCol}
                    className="hm-cell"
                    style={{ background: color(r) }}
                    title={
                      rowCol !== colCol
                        ? `r=${r.toFixed(3)}${significant ? " *" : " (ns)"}`
                        : ""
                    }
                  >
                    {r.toFixed(2)}
                    {rowCol !== colCol && significant ? "*" : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
        * p &lt; 0.05 (two-tailed) · Unmarked cells are not statistically significant
      </p>
    </div>
  );
}
