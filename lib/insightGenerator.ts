// ─── Insight Generator ────────────────────────────────────────────────────────
// Converts statistical findings into human-readable insights.
// All claims are grounded in correct statistical interpretation.

import {
  ColumnMeta, ColumnStats, CorrelationResult,
  Insight, NumericStats, CategoricalStats
} from '@/types/dataset';

let _id = 0;
const id = () => `insight-${++_id}`;

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export function generateInsights(
  columns: ColumnMeta[],
  stats: Record<string, ColumnStats>,
  correlations: CorrelationResult[]
): Insight[] {
  _id = 0;
  const insights: Insight[] = [];

  // ── Correlation insights — only report statistically significant ones ───────
  correlations.forEach(({ colA, colB, r, pValue, n, significant }) => {
    if (!significant) return; // don't report non-significant correlations

    if (Math.abs(r) >= 0.7) {
      const direction = r > 0 ? 'positive' : 'negative';
      const strength = Math.abs(r) >= 0.9 ? 'very strong' : 'strong';
      insights.push({
        id: id(),
        type: 'correlation',
        severity: 'highlight',
        title: `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation`,
        body: `"${colA}" and "${colB}" have a ${strength} ${direction} linear relationship (r = ${fmt(r)}, p = ${pValue < 0.001 ? '< 0.001' : fmt(pValue, 3)}, n = ${n}). This result is statistically significant.`,
      });
    } else if (Math.abs(r) >= 0.4) {
      const direction = r > 0 ? 'positive' : 'negative';
      insights.push({
        id: id(),
        type: 'correlation',
        severity: 'info',
        title: `Moderate ${direction} correlation`,
        body: `"${colA}" and "${colB}" show a moderate ${direction} linear association (r = ${fmt(r)}, p = ${fmt(pValue, 3)}, n = ${n}).`,
      });
    }
  });

  // ── Non-significant strong-looking correlations — important warning ─────────
  correlations.forEach(({ colA, colB, r, pValue, n, significant }) => {
    if (!significant && Math.abs(r) >= 0.6 && n < 30) {
      insights.push({
        id: id(),
        type: 'correlation',
        severity: 'warning',
        title: `Apparent correlation may not be reliable`,
        body: `"${colA}" and "${colB}" show r = ${fmt(r)} but p = ${fmt(pValue, 3)} — not significant at α = 0.05. With only n = ${n} pairs, this could be a chance finding. Collect more data before drawing conclusions.`,
      });
    }
  });

  // ── Per-column insights ────────────────────────────────────────────────────
  for (const col of columns) {
    const s = stats[col.name];
    if (!s) continue;

    if (col.type === 'numeric') {
      const ns = s as NumericStats;

      // Skewness — using standard interpretation thresholds
      if (Math.abs(ns.skewness) > 1) {
        const direction = ns.skewness > 0 ? 'right (positive)' : 'left (negative)';
        const label = ns.skewness > 0 ? 'a long right tail — most values are low with some very large ones' : 'a long left tail — most values are high with some very small ones';
        insights.push({
          id: id(),
          type: 'distribution',
          severity: 'warning',
          title: `"${col.name}" is highly skewed ${direction}`,
          body: `Skewness = ${fmt(ns.skewness)}. The distribution has ${label}. Mean (${fmt(ns.mean)}) is pulled away from median (${fmt(ns.median)}). Consider log-transforming before modeling.`,
        });
      } else if (Math.abs(ns.skewness) > 0.5) {
        const direction = ns.skewness > 0 ? 'right' : 'left';
        insights.push({
          id: id(),
          type: 'distribution',
          severity: 'info',
          title: `"${col.name}" is moderately skewed ${direction}`,
          body: `Skewness = ${fmt(ns.skewness)}. Mean = ${fmt(ns.mean)}, median = ${fmt(ns.median)}. Mild asymmetry — worth noting for parametric tests.`,
        });
      }

      // Kurtosis
      if (ns.kurtosis > 3) {
        insights.push({
          id: id(),
          type: 'distribution',
          severity: 'warning',
          title: `Heavy tails in "${col.name}" (leptokurtic)`,
          body: `Excess kurtosis = ${fmt(ns.kurtosis)}. The distribution has heavier tails than a normal distribution, meaning extreme values occur more frequently than expected. Outlier-robust methods are recommended.`,
        });
      }

      // High CV
      const cv = ns.std / Math.abs(ns.mean);
      if (cv > 1 && ns.mean !== 0) {
        insights.push({
          id: id(),
          type: 'distribution',
          severity: 'info',
          title: `High relative variability in "${col.name}"`,
          body: `Coefficient of variation = ${fmt(cv * 100)}% (std/mean). Values are widely dispersed relative to the mean — the column may contain distinct sub-populations.`,
        });
      }
    }

    if (col.type === 'categorical') {
      const cs = s as CategoricalStats;

      if (cs.mostCommonPct >= 0.6) {
        insights.push({
          id: id(),
          type: 'dominance',
          severity: 'warning',
          title: `Class imbalance in "${col.name}"`,
          body: `"${cs.mostCommon}" accounts for ${fmt(cs.mostCommonPct * 100)}% of non-missing records. This imbalance may bias classifiers trained on this column — consider resampling or stratified evaluation.`,
        });
      }

      // Low entropy = low diversity
      if (cs.entropy < 1 && cs.frequencies.length > 1) {
        insights.push({
          id: id(),
          type: 'distribution',
          severity: 'info',
          title: `Low category diversity in "${col.name}"`,
          body: `Shannon entropy = ${fmt(cs.entropy)} bits. The column is dominated by very few categories. Maximum possible entropy for ${cs.frequencies.length} categories would be ${fmt(Math.log2(cs.frequencies.length))} bits.`,
        });
      }
    }

    // Missing values
    if (col.missingCount > 0) {
      const totalRows = col.missingCount + col.uniqueCount; // approximate
      insights.push({
        id: id(),
        type: 'missing',
        severity: col.missingCount > 10 ? 'warning' : 'info',
        title: `Missing values in "${col.name}"`,
        body: `${col.missingCount} missing value${col.missingCount > 1 ? 's' : ''} detected (including N/A, null, empty). Review missingness mechanism (MCAR/MAR/MNAR) before imputing.`,
      });
    }
  }

  // ── Dataset-level summary ──────────────────────────────────────────────────
  const numericCols = columns.filter((c) => c.type === 'numeric').length;
  const catCols = columns.filter((c) => c.type === 'categorical').length;
  const sigCorrs = correlations.filter((c) => c.significant).length;
  insights.push({
    id: id(),
    type: 'general',
    severity: 'info',
    title: 'Dataset composition',
    body: `${numericCols} numeric column${numericCols !== 1 ? 's' : ''}, ${catCols} categorical column${catCols !== 1 ? 's' : ''}. ${correlations.length} numeric column pairs evaluated — ${sigCorrs} statistically significant correlation${sigCorrs !== 1 ? 's' : ''} found (α = 0.05).`,
  });

  return insights;
}
