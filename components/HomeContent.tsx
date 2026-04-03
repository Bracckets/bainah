"use client";

import { startTransition, useEffect, useState } from "react";
import UploadPanel from "@/components/UploadPanel";
import DatasetSummary from "@/components/DatasetSummary";
import ChartsPanel from "@/components/ChartsPanel";
import InsightsPanel from "@/components/InsightsPanel";
import AnomalyTable from "@/components/AnomalyTable";
import GlossaryPanel from "@/components/GlossaryPanel";
import ApiKeyPanel from "@/components/ApiKeyPanel";
import AnalysisWizard from "@/components/AnalysisWizard";
import SystemIcon from "@/components/SystemIcon";
import { ParsedDataset } from "@/types/dataset";

type WorkspaceView = "overview" | "charts" | "insights" | "anomalies" | "model";

interface HomeContentProps {
  dataset: ParsedDataset | null;
  loading: boolean;
  error: string | null;
  filename: string;
  insightSource: "ai" | "rules" | "loading" | null;
  providerLabel: string;
  onFile: (file: File) => Promise<void>;
}

const WORKSPACE_VIEWS: {
  id: WorkspaceView;
  label: string;
  icon: Parameters<typeof SystemIcon>[0]["name"];
}[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "charts", label: "Charts", icon: "charts" },
  { id: "insights", label: "Insights", icon: "insights" },
  { id: "anomalies", label: "Anomalies", icon: "anomalies" },
  { id: "model", label: "Model", icon: "model" },
];

const ENTRY_POINTS = [
  {
    title: "Drop a file",
    body: "Start with one CSV or Excel file. Parsing and analysis remain in the browser workflow.",
    icon: "upload" as const,
  },
  {
    title: "Stay oriented",
    body: "Move between overview, charts, insights, anomalies, and modeling without losing the active file.",
    icon: "overview" as const,
  },
  {
    title: "Add AI when needed",
    body: "Use a session-only provider key for upgraded insights, or continue with rule-based analysis.",
    icon: "spark" as const,
  },
];

const STORY_STAGES: {
  id: WorkspaceView;
  label: string;
  eyebrow: string;
  body: string;
  detail: string;
  icon: Parameters<typeof SystemIcon>[0]["name"];
}[] = [
  {
    id: "overview",
    label: "Overview",
    eyebrow: "Start with structure",
    body: "See how many rows, columns, missing values, and usable fields the file gives you before doing anything else.",
    detail: "This is the quickest way to sanity-check whether the dataset is analysis-ready.",
    icon: "overview",
  },
  {
    id: "charts",
    label: "Charts",
    eyebrow: "Move into shape",
    body: "Flip through focused chart families so distributions, categories, and correlations stay readable on phone or desktop.",
    detail: "The charts stage is designed to reduce scanning fatigue and keep one visual question in view at a time.",
    icon: "charts",
  },
  {
    id: "insights",
    label: "Insights",
    eyebrow: "Read the narrative",
    body: "Generated findings condense the patterns you just saw into decisions, warnings, and high-signal takeaways.",
    detail: "AI can upgrade this stage, but the base flow still works with rule-based findings only.",
    icon: "insights",
  },
  {
    id: "anomalies",
    label: "Anomalies",
    eyebrow: "Check the edges",
    body: "Review flagged rows before they distort your assumptions, summary metrics, or baseline model.",
    detail: "Use this stage when you need to understand whether outliers are noise, errors, or genuinely important cases.",
    icon: "anomalies",
  },
  {
    id: "model",
    label: "Model",
    eyebrow: "End with action",
    body: "Run a fast driver analysis or local baseline model once you understand the data well enough to trust the target.",
    detail: "This turns the workspace from a viewer into a practical decision surface.",
    icon: "model",
  },
];

const MIN_RECOMMENDED_VIEWPORT_PX = 487;

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function HomeContent({
  dataset,
  loading,
  error,
  filename,
  insightSource,
  providerLabel,
  onFile,
}: HomeContentProps) {
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyDismissed, setStoryDismissed] = useState(false);
  const [storyFinished, setStoryFinished] = useState(false);

  useEffect(() => {
    if (dataset || storyDismissed || storyFinished) return;

    const timeout = window.setTimeout(() => {
      setStoryIndex((current) => {
        if (current >= STORY_STAGES.length - 1) {
          setStoryFinished(true);
          return current;
        }
        return current + 1;
      });
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [dataset, storyDismissed, storyFinished, storyIndex]);

  const snapshot = dataset
    ? {
        rows: dataset.rowCount.toLocaleString(),
        columns: dataset.colCount,
        missing: dataset.columns.reduce(
          (sum, column) => sum + column.missingCount,
          0
        ),
        numeric: dataset.columns.filter((column) => column.type === "numeric").length,
        significant: dataset.correlations.filter((item) => item.significant).length,
        anomalies: dataset.anomalies.length,
      }
    : null;

  const exportDataset = () => {
    if (!dataset) return;
    const columns = dataset.columns.map((column) => column.name);
    const header = `${columns.map((column) => `"${column}"`).join(",")}\n`;
    const body = dataset.rows
      .map((row) =>
        columns
          .map((column) => {
            const value = row[column] ?? "";
            return value.includes(",") || value.includes('"')
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(",")
      )
      .join("\n");
    downloadCsv(header + body, `${filename || "dataset"}.csv`);
  };

  const renderWorkspaceView = () => {
    if (!dataset) return null;

    switch (activeView) {
      case "overview":
        return (
          <>
            <DatasetSummary dataset={dataset} />
            <GlossaryPanel />
          </>
        );
      case "charts":
        return <ChartsPanel dataset={dataset} />;
      case "insights":
        return (
          <InsightsPanel
            insights={dataset.insights}
            source={insightSource ?? "rules"}
            providerLabel={providerLabel}
          />
        );
      case "anomalies":
        return <AnomalyTable anomalies={dataset.anomalies} />;
      case "model":
        return <AnalysisWizard dataset={dataset} />;
      default:
        return null;
    }
  };

  const selectedStoryStage = STORY_STAGES[storyIndex];

  const handleStorySkip = () => {
    setStoryDismissed(true);
    setStoryFinished(true);
  };

  const handleWorkspaceViewChange = (view: WorkspaceView) => {
    startTransition(() => {
      setActiveView(view);
    });
  };

  const handleStoryChoose = (view: WorkspaceView) => {
    handleWorkspaceViewChange(view);
    setStoryDismissed(true);
    setStoryFinished(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell app-shell--apple">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-mark" aria-label="BAINAH">
            <img
              src="/logo - header.svg"
              alt="BAINAH Logo"
              className="brand-mark-image"
            />
          </div>
          <ApiKeyPanel />
        </div>
      </header>

      <main className="page-shell">
        <section className="device-advisory" aria-label="Device recommendation">
          <div className="device-advisory-icon">
            <SystemIcon name="overview" size={16} />
          </div>
          <p className="device-advisory-text">
            For the best Bayynah experience, we recommend using a desktop or an
            iPad. Views narrower than about {MIN_RECOMMENDED_VIEWPORT_PX}px may
            need horizontal scrolling in some workspaces.
          </p>
        </section>

        <section className="hero-stage">
          <div className="hero-copy">
            <span className="hero-eyebrow">Browser-native analysis</span>
            <h1 className="hero-title">
              Understand a dataset in one calm, continuous workspace.
            </h1>
            <p className="hero-body">
              Upload once and move from structure to action without breaking context.
            </p>

            <div className="hero-points">
              {ENTRY_POINTS.map((point) => (
                <div key={point.title} className="hero-point">
                  <div className="hero-point-icon">
                    <SystemIcon name={point.icon} size={16} />
                  </div>
                  <div className="hero-point-copy">
                    <p className="hero-point-title">{point.title}</p>
                    <p className="hero-point-body">{point.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="upload-stage">
            {!dataset && !storyDismissed ? (
              <div className="story-stage">
                <div className="story-stage-head">
                  <div>
                    <p className="section-kicker">Guided tour</p>
                    <h2 className="section-title-large">See the flow first</h2>
                  </div>
                  <button className="story-skip" onClick={handleStorySkip}>
                    Skip
                  </button>
                </div>

                <div className="story-stage-card">
                  <div className="story-stage-icon">
                    <SystemIcon name={selectedStoryStage.icon} size={18} />
                  </div>
                  <div className="story-stage-copy">
                    <p className="story-stage-eyebrow">
                      {selectedStoryStage.eyebrow}
                    </p>
                    <p className="story-stage-title">
                      {selectedStoryStage.label}
                    </p>
                    <p className="story-stage-body">
                      {selectedStoryStage.body}
                    </p>
                    <p className="story-stage-detail">
                      {selectedStoryStage.detail}
                    </p>
                  </div>
                </div>

                <div className="story-progress" aria-label="Story progress">
                  {STORY_STAGES.map((stage, index) => (
                    <button
                      key={stage.id}
                      className={`story-progress-step ${
                        index === storyIndex ? "story-progress-step--active" : ""
                      } ${index < storyIndex ? "story-progress-step--past" : ""}`}
                      onClick={() => {
                        setStoryIndex(index);
                        if (index < STORY_STAGES.length - 1) {
                          setStoryFinished(false);
                        }
                      }}
                    >
                          <span className="story-progress-dot" />
                          <span className="story-progress-label">{stage.label}</span>
                        </button>
                  ))}
                </div>

                {storyFinished && (
                  <div className="story-chooser">
                    <p className="story-chooser-title">
                      Pick the stage you want to open first after upload.
                    </p>
                    <div className="story-chooser-actions">
                      {STORY_STAGES.map((stage) => (
                            <button
                              key={stage.id}
                              className="story-choice"
                              onClick={() => handleStoryChoose(stage.id)}
                        >
                          <SystemIcon name={stage.icon} size={15} />
                          <span>{stage.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="upload-stage-head">
                  <div>
                    <p className="section-kicker">Start here</p>
                    <h2 className="section-title-large">Add a file</h2>
                  </div>
                  <div className="upload-stage-security">
                    <SystemIcon name="security" size={16} />
                    <span>Session-only key support</span>
                  </div>
                </div>

                <UploadPanel onFile={onFile} isLoading={loading} />

                <div className="upload-stage-status">
                  {loading && (
                    <div className="loading-bar">
                      <div className="loading-progress" />
                    </div>
                  )}
                  {error && <p className="status-line status-line--error">{error}</p>}
                  {dataset && !loading && snapshot && (
                    <p className="status-line status-line--success">
                      <SystemIcon name="file" size={14} />
                      <span>
                        {filename} loaded with {snapshot.rows} rows and {snapshot.columns} columns.
                      </span>
                    </p>
                  )}
                  {!dataset && !loading && !error && (
                    <p className="status-line">
                      <SystemIcon name="upload" size={14} />
                      <span>
                        CSV and Excel files are supported. AI is optional and the workspace still works without it.
                      </span>
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </section>

        {dataset && snapshot ? (
          <>
            <section className="workspace-header">
              <div className="workspace-header-main">
                <div className="workspace-file-pill">
                  <SystemIcon name="file" size={14} />
                  <span>{filename}</span>
                </div>
                <div className="workspace-status-pill">
                  <SystemIcon
                    name={insightSource === "ai" ? "spark" : "overview"}
                    size={14}
                  />
                  <span>
                    {insightSource === "ai"
                      ? `AI via ${providerLabel}`
                      : insightSource === "loading"
                        ? `Waiting for ${providerLabel}`
                        : "Rule-based insights"}
                  </span>
                </div>
              </div>

              <div className="workspace-metrics">
                <MetricTile label="Rows" value={snapshot.rows} icon="file" />
                <MetricTile label="Columns" value={String(snapshot.columns)} icon="overview" />
                <MetricTile
                  label="Missing"
                  value={String(snapshot.missing)}
                  icon="anomalies"
                  tone={snapshot.missing > 0 ? "warn" : "default"}
                />
                <MetricTile label="Numeric" value={String(snapshot.numeric)} icon="charts" />
                <MetricTile
                  label="Signals"
                  value={String(snapshot.significant)}
                  icon="insights"
                />
              </div>
            </section>

            <nav className="workspace-nav" aria-label="Analysis views">
              <div className="workspace-nav-scroll">
                {WORKSPACE_VIEWS.map((view) => (
                  <button
                    key={view.id}
                    className={`workspace-nav-button ${
                      activeView === view.id ? "workspace-nav-button--active" : ""
                    }`}
                    onClick={() => handleWorkspaceViewChange(view.id)}
                  >
                    <span className="workspace-nav-icon">
                      <SystemIcon name={view.icon} size={16} />
                    </span>
                    <span className="workspace-nav-text">{view.label}</span>
                  </button>
                ))}
              </div>
            </nav>

            <section className="workspace-layout">
              <div key={activeView} className="workspace-main workspace-main--fade">
                {renderWorkspaceView()}
              </div>

              <aside className="workspace-sidebar">
                <div className="sidebar-block">
                  <p className="section-kicker">Actions</p>
                  <div className="sidebar-actions">
                    <button
                      className="sidebar-action"
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    >
                      <SystemIcon name="refresh" size={16} />
                      <span>Upload another file</span>
                    </button>
                    <button className="sidebar-action" onClick={exportDataset}>
                      <SystemIcon name="download" size={16} />
                      <span>Download dataset CSV</span>
                    </button>
                    <button
                      className="sidebar-action"
                      onClick={() => handleWorkspaceViewChange("model")}
                    >
                      <SystemIcon name="model" size={16} />
                      <span>Open model workspace</span>
                    </button>
                  </div>
                </div>

                <div className="sidebar-block">
                  <p className="section-kicker">Current focus</p>
                  <p className="sidebar-note">
                    {
                      {
                        overview:
                          "Use overview to verify structure, missingness, and column-level summaries before making assumptions.",
                        charts:
                          "Charts switch between distributions, categories, correlations, and scatter views without changing the active file.",
                        insights:
                          "Generated findings stay grounded in the same statistics already visible in the workspace.",
                        anomalies:
                          "Review flagged rows here before deciding whether they represent errors, rare cases, or meaningful outliers.",
                        model:
                          "The model workspace gives you a quick local baseline without leaving the product surface.",
                      }[activeView]
                    }
                  </p>
                </div>
              </aside>
            </section>
          </>
        ) : (
          <section className="preflight-stage">
            <div className="preflight-head">
              <p className="section-kicker">What opens after upload</p>
              <h2 className="section-title-large">A single surface with five lenses.</h2>
            </div>

            <div className="preflight-grid">
              {WORKSPACE_VIEWS.map((view) => (
                <div key={view.id} className="preflight-tile">
                  <div className="preflight-tile-icon">
                    <SystemIcon name={view.icon} size={16} />
                  </div>
                  <p className="preflight-tile-title">{view.label}</p>
                  <p className="preflight-tile-body">
                    {view.id === "overview" &&
                      "Read structure, missingness, and column summaries without digging through raw rows."}
                    {view.id === "charts" &&
                      "Flip through focused chart families designed to stay readable on phone and desktop."}
                    {view.id === "insights" &&
                      "Compare generated findings with the same statistics shown elsewhere in the workspace."}
                    {view.id === "anomalies" &&
                      "Inspect flagged rows in a cleaner review surface before exporting or modeling."}
                    {view.id === "model" &&
                      "Run a quick driver analysis or baseline model from the same context."}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function MetricTile({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: Parameters<typeof SystemIcon>[0]["name"];
  tone?: "default" | "warn";
}) {
  return (
    <div className={`metric-tile ${tone === "warn" ? "metric-tile--warn" : ""}`}>
      <div className="metric-tile-head">
        <span className="metric-tile-icon">
          <SystemIcon name={icon} size={14} />
        </span>
        <span className="metric-tile-label">{label}</span>
      </div>
      <span className="metric-tile-value">{value}</span>
    </div>
  );
}
