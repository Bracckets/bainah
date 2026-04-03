"use client";

import { useEffect, useState } from "react";
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

type ChartView = "numeric" | "categorical" | "correlation" | "scatter";

interface Props {
  dataset: ParsedDataset;
}

const TOOLTIP_STYLE = {
  background: "rgba(15, 23, 42, 0.94)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 10,
  color: "#ffffff",
};

const TOOLTIP_LABEL_STYLE = {
  color: "#ffffff",
};

const TOOLTIP_ITEM_STYLE = {
  color: "#ffffff",
};

export default function ChartsPanel({ dataset }: Props) {
  const [activeView, setActiveView] = useState<ChartView>("numeric");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const numericColumns = dataset.columns.filter((column) => column.type === "numeric");
  const categoricalColumns = dataset.columns.filter(
    (column) => column.type === "categorical"
  );
  const strongCorrelations = dataset.correlations
    .filter((item) => Math.abs(item.r) >= 0.7 && item.significant)
    .slice(0, 6);

  const chartCount =
    activeView === "numeric"
      ? numericColumns.length
      : activeView === "categorical"
        ? categoricalColumns.length
        : activeView === "scatter"
          ? strongCorrelations.length
          : 1;

  useEffect(() => {
    setSelectedIndex(0);
  }, [activeView]);

  useEffect(() => {
    if (selectedIndex >= chartCount) {
      setSelectedIndex(0);
    }
  }, [chartCount, selectedIndex]);

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-head">
        <div>
          <p className="panel-kicker">Charts</p>
          <h2 className="panel-title">Inspect one chart family at a time</h2>
        </div>
        <p className="panel-note">
          Mobile keeps the view focused. Larger screens open up denser chart
          comparisons without changing the dataset context.
        </p>
      </div>

      <div className="chart-switcher">
        {[
          { id: "numeric", label: "Distributions" },
          { id: "categorical", label: "Categories" },
          { id: "correlation", label: "Correlation map" },
          { id: "scatter", label: "Scatter pairs" },
        ].map((view) => (
          <button
            key={view.id}
            className={`workspace-chip ${
              activeView === view.id ? "workspace-chip--active" : ""
            }`}
            onClick={() => setActiveView(view.id as ChartView)}
          >
            {view.label}
          </button>
        ))}
      </div>

      {(activeView === "numeric" || activeView === "categorical" || activeView === "scatter") &&
        chartCount > 1 && (
          <div className="chart-selector">
            {(activeView === "numeric"
              ? numericColumns
              : activeView === "categorical"
                ? categoricalColumns
                : strongCorrelations.map((item) => ({
                    name: `${item.colA} vs ${item.colB}`,
                  }))
            ).map((item, index) => (
              <button
                key={item.name}
                className={`chart-selector-button ${
                  selectedIndex === index ? "chart-selector-button--active" : ""
                }`}
                onClick={() => setSelectedIndex(index)}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

      {activeView === "numeric" && (
        <div className="chart-stack">
          {numericColumns.length === 0 ? (
            <p className="empty-state">No numeric columns available for distribution charts.</p>
          ) : (
            <>
              <div className="chart-mobile-card">
                {renderNumericChart(dataset, numericColumns[selectedIndex].name)}
              </div>
              <div className="chart-grid chart-grid--desktop">
                {numericColumns.slice(0, 6).map((column) => (
                  <div key={column.name} className="chart-card">
                    {renderNumericChart(dataset, column.name)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeView === "categorical" && (
        <div className="chart-stack">
          {categoricalColumns.length === 0 ? (
            <p className="empty-state">No categorical columns available for frequency charts.</p>
          ) : (
            <>
              <div className="chart-mobile-card">
                {renderCategoricalChart(dataset, categoricalColumns[selectedIndex].name)}
              </div>
              <div className="chart-grid chart-grid--desktop">
                {categoricalColumns.slice(0, 4).map((column) => (
                  <div key={column.name} className="chart-card">
                    {renderCategoricalChart(dataset, column.name)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeView === "correlation" && (
        <div className="chart-stack">
          {dataset.correlations.length > 0 ? (
            <CorrelationHeatmap dataset={dataset} />
          ) : (
            <p className="empty-state">Need at least two numeric columns to draw the correlation map.</p>
          )}
        </div>
      )}

      {activeView === "scatter" && (
        <div className="chart-stack">
          {strongCorrelations.length === 0 ? (
            <p className="empty-state">No strong significant correlations were found for scatter views.</p>
          ) : (
            <>
              <div className="chart-mobile-card">
                {renderScatterChart(dataset, strongCorrelations[selectedIndex])}
              </div>
              <div className="chart-grid chart-grid--desktop">
                {strongCorrelations.map((correlation) => (
                  <div
                    key={`${correlation.colA}-${correlation.colB}`}
                    className="chart-card"
                  >
                    {renderScatterChart(dataset, correlation)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function renderNumericChart(dataset: ParsedDataset, columnName: string) {
  const stats = dataset.stats[columnName] as NumericStats;
  if (!stats) return null;

  return (
    <>
      <div className="chart-card-head">
        <p className="chart-label">{columnName}</p>
        <p className="chart-kicker">Freedman-Diaconis bins</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={stats.histogram} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <XAxis
            dataKey="bin"
            tick={{ fontSize: 9, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{ ...TOOLTIP_STYLE, fontSize: 11 }}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
          />
          <Bar dataKey="count" fill="var(--accent)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="chart-meta">
        Mean {stats.mean.toFixed(2)} · std {stats.std.toFixed(2)} · skew{" "}
        {stats.skewness.toFixed(2)} · kurt {stats.kurtosis.toFixed(2)}
      </p>
      <p className="chart-meta">
        Q1 {stats.q1.toFixed(2)} · Q3 {stats.q3.toFixed(2)} · IQR {stats.iqr.toFixed(2)}
      </p>
    </>
  );
}

function renderCategoricalChart(dataset: ParsedDataset, columnName: string) {
  const stats = dataset.stats[columnName] as CategoricalStats;
  if (!stats) return null;

  return (
    <>
      <div className="chart-card-head">
        <p className="chart-label">{columnName}</p>
        <p className="chart-kicker">Top categories</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={stats.frequencies.slice(0, 10)}
          layout="vertical"
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="value"
            tick={{ fontSize: 9, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={84}
          />
          <Tooltip
            contentStyle={{ ...TOOLTIP_STYLE, fontSize: 11 }}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
          />
          <Bar dataKey="count" fill="var(--accent)" radius={[0, 8, 8, 0]}>
            {stats.frequencies.slice(0, 10).map((_, index) => (
              <Cell key={index} opacity={1 - index * 0.05} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="chart-meta">
        Dominant value {stats.mostCommon} · entropy {stats.entropy.toFixed(2)}
      </p>
    </>
  );
}

function renderScatterChart(
  dataset: ParsedDataset,
  correlation: ParsedDataset["correlations"][number]
) {
  const points = dataset.rows
    .map((row) => ({
      x: parseFloat(row[correlation.colA]?.replace(/,/g, "") ?? ""),
      y: parseFloat(row[correlation.colB]?.replace(/,/g, "") ?? ""),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .slice(0, 300);

  return (
    <>
      <div className="chart-card-head">
        <p className="chart-label">
          {correlation.colA} vs {correlation.colB}
        </p>
        <p className="chart-kicker">
          r {correlation.r.toFixed(2)} · p{" "}
          {correlation.pValue < 0.001 ? "< 0.001" : correlation.pValue.toFixed(3)}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 9, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="y"
            tick={{ fontSize: 9, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ ...TOOLTIP_STYLE, fontSize: 11 }}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
          />
          <Scatter data={points} fill="var(--accent)" opacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="chart-meta">Showing up to 300 paired rows from the selected columns.</p>
    </>
  );
}

function CorrelationHeatmap({ dataset }: { dataset: ParsedDataset }) {
  const numericColumns = dataset.columns
    .filter((column) => column.type === "numeric")
    .map((column) => column.name);

  if (numericColumns.length < 2) return null;

  const correlationMap: Record<string, { r: number; significant: boolean }> = {};
  dataset.correlations.forEach(({ colA, colB, r, significant }) => {
    correlationMap[`${colA}::${colB}`] = { r, significant };
    correlationMap[`${colB}::${colA}`] = { r, significant };
  });

  const getCorrelation = (left: string, right: string) =>
    left === right
      ? { r: 1, significant: true }
      : correlationMap[`${left}::${right}`] ?? { r: 0, significant: false };

  const getColor = (value: number) => {
    if (value >= 1) return "#D7C287";
    if (value > 0.7) return "#6BC787";
    if (value > 0.3) return "#465F52";
    if (value < -0.7) return "#D06F64";
    if (value < -0.3) return "#734E4A";
    return "var(--surface-subtle)";
  };

  return (
    <div className="heatmap-shell">
      <table className="heatmap">
        <thead>
          <tr>
            <th />
            {numericColumns.map((column) => (
              <th key={column} className="hm-header">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {numericColumns.map((rowColumn) => (
            <tr key={rowColumn}>
              <td className="hm-row-label">{rowColumn}</td>
              {numericColumns.map((colColumn) => {
                const { r, significant } = getCorrelation(rowColumn, colColumn);
                return (
                  <td
                    key={colColumn}
                    className="hm-cell"
                    style={{ background: getColor(r) }}
                    title={
                      rowColumn === colColumn
                        ? "Same column"
                        : `r=${r.toFixed(3)}${
                            significant ? " significant" : " not significant"
                          }`
                    }
                  >
                    {r.toFixed(2)}
                    {rowColumn !== colColumn && significant ? "*" : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="chart-meta">
        Significant cells are marked with * at p &lt; 0.05.
      </p>
    </div>
  );
}
