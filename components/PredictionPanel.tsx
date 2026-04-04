"use client";

import { PredictionResult, ParsedDataset } from "@/types/dataset";
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
  ReferenceLine,
  Cell,
} from "recharts";
import ExportPanel from "./ExportPanel";

interface Props {
  result: PredictionResult;
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

export default function PredictionPanel({ result, dataset }: Props) {
  const isRegression = result.taskType === "regression";
  const regressionImproved =
    isRegression &&
    result.rmse !== undefined &&
    result.baselineRmse !== undefined &&
    result.rmse < result.baselineRmse;
  const classificationImproved =
    !isRegression &&
    result.accuracy !== undefined &&
    result.baselineAccuracy !== undefined &&
    result.accuracy > result.baselineAccuracy;

  return (
    <div className="wizard-result">
      <p className="wizard-result-summary">{result.summary}</p>

      <div className="stat-grid">
        <MetricBox label="Model" value={result.modelName} compact />
        <MetricBox label="Evaluation" value={result.evaluationLabel} compact />
        <MetricBox label="Train rows" value={result.trainRowCount.toLocaleString()} />
        <MetricBox label="Test rows" value={result.testRowCount.toLocaleString()} />
        {isRegression && result.r2 !== undefined && (
          <>
            <MetricBox
              label="Test R-squared"
              value={result.r2.toFixed(3)}
              tone={result.r2 > 0.6 ? "good" : "default"}
            />
            <MetricBox
              label="Test RMSE"
              value={result.rmse!.toFixed(2)}
              tone={regressionImproved ? "good" : "default"}
            />
            <MetricBox label="Baseline RMSE" value={result.baselineRmse!.toFixed(2)} />
            <MetricBox label="Test MAE" value={result.mae!.toFixed(2)} />
          </>
        )}
        {!isRegression && result.accuracy !== undefined && (
          <>
            <MetricBox
              label="Test accuracy"
              value={`${(result.accuracy * 100).toFixed(1)}%`}
              tone={classificationImproved ? "good" : "default"}
            />
            <MetricBox
              label="Baseline accuracy"
              value={`${((result.baselineAccuracy ?? 0) * 100).toFixed(1)}%`}
            />
          </>
        )}
        <MetricBox label="Complete rows" value={result.completeRowCount.toLocaleString()} />
      </div>

      {result.warnings.length > 0 && (
        <div className="workspace-chip-row">
          {result.warnings.map((warning) => (
            <span key={warning} className="workspace-chip workspace-chip--muted">
              {warning}
            </span>
          ))}
        </div>
      )}

      {result.featureImportance.length > 0 && (
        <>
          <h3 className="sub-title">Feature importance</h3>
          <ResponsiveContainer
            width="100%"
            height={Math.max(180, result.featureImportance.length * 32)}
          >
            <BarChart
              data={result.featureImportance.slice(0, 10)}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
            >
              <XAxis
                type="number"
                domain={[0, 1]}
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="feature"
                width={132}
                tick={{ fontSize: 11, fill: "var(--text-soft)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ ...TOOLTIP_STYLE, fontSize: 11 }}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                formatter={(value: number) => [value.toFixed(3), "importance"]}
              />
              <Bar dataKey="importance" radius={[0, 8, 8, 0]}>
                {result.featureImportance.slice(0, 10).map((_, index) => (
                  <Cell key={index} fill="var(--accent)" opacity={1 - index * 0.07} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {isRegression && result.plottedPredictions.length > 0 && (
        <>
          <h3 className="sub-title">Held-out actual vs predicted</h3>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis
                dataKey="actual"
                tick={{ fontSize: 9, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="predicted"
                tick={{ fontSize: 9, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine
                segment={[
                  {
                    x: Math.min(...result.plottedPredictions.map((item) => item.actual)),
                    y: Math.min(...result.plottedPredictions.map((item) => item.actual)),
                  },
                  {
                    x: Math.max(...result.plottedPredictions.map((item) => item.actual)),
                    y: Math.max(...result.plottedPredictions.map((item) => item.actual)),
                  },
                ]}
                stroke="var(--muted)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Tooltip
                contentStyle={{ ...TOOLTIP_STYLE, fontSize: 11 }}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                formatter={(value: number) => [value.toFixed(2)]}
              />
              <Scatter data={result.plottedPredictions} fill="var(--accent)" opacity={0.58} />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="chart-meta">
            The dashed line marks perfect prediction on the test split. Tighter
            clustering means a stronger holdout fit, not just a better in-sample score.
          </p>
        </>
      )}

      <ExportPanel result={result} />
    </div>
  );
}

function MetricBox({
  label,
  value,
  tone = "default",
  compact,
}: {
  label: string;
  value: string;
  tone?: "default" | "good";
  compact?: boolean;
}) {
  const isSingleToken = !/\s/.test(value);

  return (
    <div className="stat-stack">
      <div className="stat-box">
        <span
          className={`stat-value ${isSingleToken ? "stat-value--single-token" : ""}`}
          style={{
            fontSize: compact ? "1.15rem" : undefined,
            color: tone === "good" ? "var(--accent)" : undefined,
          }}
        >
          {value}
        </span>
      </div>
      <span className="stat-label stat-label--outside">{label}</span>
    </div>
  );
}
