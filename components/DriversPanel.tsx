"use client";

import { DriversAnalysis } from "@/types/dataset";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface Props {
  result: DriversAnalysis;
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

export default function DriversPanel({ result }: Props) {
  const chartData = result.drivers.slice(0, 12).map((driver) => ({
    name: driver.column,
    r: parseFloat(driver.r.toFixed(3)),
    direction: driver.direction,
    significant: driver.significant,
  }));

  return (
    <div className="wizard-result">
      <p className="wizard-result-summary">{result.summary}</p>

      {result.drivers.length === 0 ? (
        <p className="empty-state">
          No numeric feature columns were available to compare with "{result.target}".
        </p>
      ) : (
        <>
          <h3 className="sub-title">Feature correlations with {result.target}</h3>
          <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 34)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
            >
              <XAxis
                type="number"
                domain={[-1, 1]}
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={132}
                tick={{ fontSize: 11, fill: "var(--text-soft)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ ...TOOLTIP_STYLE, fontSize: 11 }}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                formatter={(value: number) => [`r = ${value}`, "Pearson r"]}
              />
              <ReferenceLine x={0} stroke="var(--line)" strokeWidth={1} />
              <Bar dataKey="r" radius={[0, 8, 8, 0]}>
                {chartData.map((driver, index) => (
                  <Cell
                    key={index}
                    fill={driver.direction === "positive" ? "var(--accent)" : "var(--warn)"}
                    opacity={driver.significant ? 1 : 0.42}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <p className="chart-meta">
            Faded bars are not statistically significant at p &lt; 0.05.
          </p>

          <div className="col-table-wrap">
            <table className="col-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Pearson r</th>
                  <th>Direction</th>
                  <th>Significant</th>
                  <th>p-value</th>
                </tr>
              </thead>
              <tbody>
                {result.drivers.slice(0, 10).map((driver) => (
                  <tr key={driver.column}>
                    <td className="col-name">{driver.column}</td>
                    <td style={{ color: "var(--accent)" }}>{driver.r.toFixed(3)}</td>
                    <td>{driver.direction}</td>
                    <td>{driver.significant ? "Yes" : "No"}</td>
                    <td>
                      {driver.pValue < 0.001 ? "< 0.001" : driver.pValue.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
