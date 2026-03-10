'use client';
// ─── GlossaryPanel ────────────────────────────────────────────────────────────
// Glossary of statistical terms actually used in BAINAH

const GLOSSARY_ITEMS = [
  {
    category: 'Central Tendency & Spread',
    items: [
      { symbol: 'μ', term: 'mean', definition: 'The average. Add all values and divide by the number of values.' },
      { symbol: 'σ', term: 'std deviation', definition: 'How spread out the values are. A small value means most data points are close to the mean.' },
      { symbol: 'IQR', term: 'interquartile range', definition: 'The spread of the middle 50% of values. Resistant to outliers.' },
      { symbol: 'Q1', term: 'first quartile', definition: 'The 25th percentile. The median of the lower half of values.' },
      { symbol: 'Q3', term: 'third quartile', definition: 'The 75th percentile. The median of the upper half of values.' },
    ],
  },
  {
    category: 'Distribution Shape',
    items: [
      { symbol: 'skew', term: 'skewness', definition: 'Measures asymmetry of the distribution. Positive = tail on the right. Negative = tail on the left. Near 0 = roughly symmetric.' },
      { symbol: 'kurt', term: 'kurtosis', definition: 'Measures how heavy the tails are. Positive = more extreme values than a normal distribution. Negative = fewer.' },
    ],
  },
  {
    category: 'Correlation & Significance',
    items: [
      { symbol: 'r', term: 'Pearson correlation', definition: 'A number between -1 and 1 measuring linear relationship strength. 1 = perfect positive, -1 = perfect negative, 0 = no linear relationship.' },
      { symbol: 'p', term: 'p-value', definition: 'The probability of seeing this result by chance if there were no real relationship. Below 0.05 is conventionally considered statistically significant.' },
      { symbol: 'n', term: 'sample size', definition: 'The number of observations or data points.' },
    ],
  },
  {
    category: 'Outlier Detection',
    items: [
      { symbol: 'Z', term: 'Z-score', definition: 'How many standard deviations a value is from the mean. A Z-score above 3 or below -3 is unusual.' },
      { term: 'IQR method (Tukey)', definition: 'Uses 1.5 × IQR above Q3 or below Q1 to detect outliers. Distribution-free and robust to skew.' },
    ],
  },
  {
    category: 'Categorical Data',
    items: [
      { symbol: 'H', term: 'Shannon entropy', definition: 'Measures diversity or unpredictability of categories. Higher = more evenly spread across categories. Lower = dominated by few categories.' },
    ],
  },
  {
    category: 'Histogram Binning',
    items: [
      { term: 'Freedman-Diaconis', definition: 'A method for choosing histogram bin width based on IQR and sample size. More robust than fixed bin counts.' },
    ],
  },
];

export default function GlossaryPanel() {
  return (
    <section className="card">
      <h2 className="section-title">Statistical Terms</h2>
      <p className="section-sub">
        Quick reference for statistical concepts used throughout this analysis.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {GLOSSARY_ITEMS.map((section) => (
          <div key={section.category}>
            <h3
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--accent)',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}
            >
              {section.category}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {section.items.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.25rem', alignItems: 'flex-start' }}>
                    {item.symbol && (
                      <code
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--accent)',
                          fontFamily: 'var(--font-mono)',
                          minWidth: '32px',
                          flexShrink: 0,
                        }}
                      >
                        {item.symbol}
                      </code>
                    )}
                    <p
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text)',
                        margin: 0,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {item.term}
                    </p>
                  </div>
                  <p
                    style={{
                      fontSize: '11px',
                      color: 'var(--text2)',
                      margin: '0 0 0 48px',
                      lineHeight: 1.5,
                    }}
                  >
                    {item.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

