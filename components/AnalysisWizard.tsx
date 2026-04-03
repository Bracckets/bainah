"use client";

import { useState } from "react";
import {
  ParsedDataset,
  WizardMode,
  DriversAnalysis,
  PredictionResult,
} from "@/types/dataset";
import { runDriversAnalysis, runPrediction } from "@/lib/analysisEngine";
import DriversPanel from "./DriversPanel";
import PredictionPanel from "./PredictionPanel";

interface Props {
  dataset: ParsedDataset;
}

const WIZARD_OPTIONS: {
  mode: WizardMode;
  label: string;
  sub: string;
}[] = [
  {
    mode: "understand",
    label: "Understand the dataset",
    sub: "Get a short structural read before modeling or exporting.",
  },
  {
    mode: "drivers",
    label: "Find drivers",
    sub: "Explain which numeric columns move most with a target metric.",
  },
  {
    mode: "predict",
    label: "Run a baseline model",
    sub: "Build a quick local baseline for a numeric or categorical target.",
  },
];

export default function AnalysisWizard({ dataset }: Props) {
  const [mode, setMode] = useState<WizardMode>("understand");
  const [targetColumn, setTargetColumn] = useState("");
  const [drivers, setDrivers] = useState<DriversAnalysis | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [running, setRunning] = useState(false);

  const numericColumns = dataset.columns.filter((column) => column.type === "numeric");
  const selectableColumns = dataset.columns.filter((column) => column.type !== "text");

  const handleRun = () => {
    if (!targetColumn) return;
    setRunning(true);

    setTimeout(() => {
      try {
        if (mode === "drivers") {
          setDrivers(runDriversAnalysis(dataset, targetColumn));
          setPrediction(null);
        }

        if (mode === "predict") {
          setPrediction(runPrediction(dataset, targetColumn));
          setDrivers(null);
        }
      } finally {
        setRunning(false);
      }
    }, 60);
  };

  const resetOutputs = () => {
    setTargetColumn("");
    setDrivers(null);
    setPrediction(null);
  };

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-head">
        <div>
          <p className="panel-kicker">Model workspace</p>
          <h2 className="panel-title">Explain a metric or test a baseline</h2>
        </div>
        <p className="panel-note">
          This guided area stays inside the same workspace so you can compare
          model outputs with the rest of the analysis without changing pages.
        </p>
      </div>

      <div className="wizard-buttons">
        {WIZARD_OPTIONS.map((option) => (
          <button
            key={option.mode}
            className={`wizard-btn ${
              mode === option.mode ? "wizard-btn--active" : ""
            }`}
            onClick={() => {
              setMode(option.mode);
              resetOutputs();
            }}
          >
            <span className="wizard-btn-label">{option.label}</span>
            <span className="wizard-btn-sub">{option.sub}</span>
          </button>
        ))}
      </div>

      {mode === "understand" && (
        <div className="wizard-result">
          <p className="wizard-result-summary">
            This dataset contains {dataset.rowCount.toLocaleString()} rows,
            {` ${dataset.colCount} columns, `}
            {dataset.columns.filter((column) => column.type === "numeric").length} numeric
            columns, and{" "}
            {dataset.correlations.filter((item) => item.significant).length} significant
            correlation pairs.
          </p>
          <div className="understand-col-list">
            {dataset.columns.map((column) => (
              <span
                key={column.name}
                className={`understand-tag understand-tag--${column.type}`}
              >
                {column.name}
                <span className="understand-tag-type">{column.type}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {(mode === "drivers" || mode === "predict") && (
        <div className="wizard-target-row">
          <label className="wizard-label">
            {mode === "drivers"
              ? "Choose a numeric target to explain"
              : "Choose a target column for a local baseline model"}
          </label>
          <div className="wizard-select-row">
            <select
              className="wizard-select"
              value={targetColumn}
              onChange={(event) => setTargetColumn(event.target.value)}
            >
              <option value="">Select a column</option>
              {(mode === "drivers" ? numericColumns : selectableColumns).map(
                (column) => (
                  <option key={column.name} value={column.name}>
                    {column.name} ({column.type})
                  </option>
                )
              )}
            </select>
            <button
              className="wizard-run-btn"
              disabled={!targetColumn || running}
              onClick={handleRun}
            >
              {running ? <span className="insights-spinner" /> : "Run analysis"}
            </button>
          </div>
        </div>
      )}

      {drivers && <DriversPanel result={drivers} />}
      {prediction && <PredictionPanel result={prediction} dataset={dataset} />}
    </section>
  );
}
