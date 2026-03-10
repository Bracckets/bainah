// ─── Insight Generator ───────────────────────────────────────────────────────
// Converts statistical findings into human-readable insights.

import { ColumnMeta, ColumnStats, CorrelationResult, Insight, NumericStats, CategoricalStats } from '@/types/dataset';

let _id = 0;
const id = () => `insight-${++_id}`;

export function generateInsights(
  columns: ColumnMeta[],
  stats: Record<string, ColumnStats>,
  correlations: CorrelationResult[]
): Insight[] {
  _id = 0;
  const insights: Insight[] = [];

  // ── Correlation insights ────────────────────────────────────────────────
  correlations.forEach(({ colA, colB, r }) => {
    if (Math.abs(r) >= 0.7) {
      const direction = r > 0 ? 'positive' : 'negative';
      const strength = Math.abs(r) >= 0.9 ? 'very strong' : 'strong';
      insights.push({
        id: id(),
        type: 'correlation',
        severity: 'highlight',
        title: `${strength.charAt(0).toUpperCase() + strength.slice(1)} correlation detected`,
        body: `"${colA}" has a ${strength} ${direction} relationship with "${colB}" (r = ${r.toFixed(2)}). Changes in one tend to ${r > 0 ? 'mirror' : 'oppose'} changes in the other.`,
      });
    }
  });

  // ── Per-column insights ──────────────────────────────────────────────────
  for (const col of columns) {
    const s = stats[col.name];
    if (!s) continue;

    if (col.type === 'numeric') {
      const ns = s as NumericStats;
      const cv = ns.std / Math.abs(ns.mean); // coefficient of variation

      if (cv > 1) {
        insights.push({
          id: id(),
          type: 'distribution',
          severity: 'warning',
          title: `High variability in "${col.name}"`,
          body: `The column "${col.name}" shows high dispersion (std = ${ns.std.toFixed(2)}, mean = ${ns.mean.toFixed(2)}). Values are widely spread — consider investigating outliers or sub-groups.`,
        });
      }

      // Skew detection: compare mean vs median
      const skewRatio = Math.abs(ns.mean - ns.median) / (ns.std || 1);
      if (skewRatio > 0.5) {
        const direction = ns.mean > ns.median ? 'right (positive)' : 'left (negative)';
        insights.push({
          id: id(),
          type: 'distribution',
          severity: 'info',
          title: `"${col.name}" is skewed ${direction}`,
          body: `The mean (${ns.mean.toFixed(2)}) and median (${ns.median.toFixed(2)}) of "${col.name}" differ notably, indicating a ${direction}-skewed distribution.`,
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
          title: `Dominant category in "${col.name}"`,
          body: `${(cs.mostCommonPct * 100).toFixed(1)}% of records in "${col.name}" belong to the category "${cs.mostCommon}". This imbalance may affect model training or represent a real-world pattern worth investigating.`,
        });
      }
    }

    if (col.missingCount > 0) {
      const pct = ((col.missingCount / (col.missingCount + (stats[col.name] ? 1 : 1))) * 100).toFixed(1);
      insights.push({
        id: id(),
        type: 'missing',
        severity: col.missingCount > 10 ? 'warning' : 'info',
        title: `Missing values in "${col.name}"`,
        body: `"${col.name}" contains ${col.missingCount} missing value${col.missingCount > 1 ? 's' : ''}. Review whether these should be imputed or excluded before analysis.`,
      });
    }
  }

  // ── General dataset insight ──────────────────────────────────────────────
  const numericCols = columns.filter((c) => c.type === 'numeric').length;
  const catCols = columns.filter((c) => c.type === 'categorical').length;
  insights.push({
    id: id(),
    type: 'general',
    severity: 'info',
    title: 'Dataset composition',
    body: `The dataset contains ${numericCols} numeric column${numericCols !== 1 ? 's' : ''} and ${catCols} categorical column${catCols !== 1 ? 's' : ''}. ${correlations.length} column pairs were evaluated for correlation.`,
  });

  return insights;
}
