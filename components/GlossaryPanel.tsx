"use client";

const GLOSSARY_ITEMS = [
  {
    category: "Central tendency and spread",
    items: [
      {
        symbol: "mean",
        term: "Average of the values in a numeric column.",
      },
      {
        symbol: "std",
        term: "How spread out values are around the mean.",
      },
      {
        symbol: "IQR",
        term: "Middle-50% spread, useful when outliers distort the average.",
      },
    ],
  },
  {
    category: "Distribution shape",
    items: [
      {
        symbol: "skew",
        term: "Shows whether a distribution leans left or right.",
      },
      {
        symbol: "kurt",
        term: "Shows how heavy the tails are compared with a normal distribution.",
      },
    ],
  },
  {
    category: "Relationships",
    items: [
      {
        symbol: "r",
        term: "Pearson correlation from -1 to 1 for linear relationships.",
      },
      {
        symbol: "p",
        term: "Probability the relationship happened by chance if there were no effect.",
      },
      {
        symbol: "n",
        term: "Number of paired observations used in the calculation.",
      },
    ],
  },
];

export default function GlossaryPanel() {
  return (
    <section className="workspace-panel workspace-panel--subtle">
      <div className="workspace-panel-head">
        <div>
          <p className="panel-kicker">Reference</p>
          <h2 className="panel-title">Statistical terms used in the workspace</h2>
        </div>
      </div>

      <div className="glossary-grid">
        {GLOSSARY_ITEMS.map((section) => (
          <div key={section.category} className="glossary-section">
            <p className="glossary-title">{section.category}</p>
            <div className="glossary-items">
              {section.items.map((item) => (
                <div key={`${section.category}-${item.symbol}`} className="glossary-item">
                  <span className="glossary-symbol">{item.symbol}</span>
                  <p className="glossary-term">{item.term}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
