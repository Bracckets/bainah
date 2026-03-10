"use client";

import { useState } from "react";
import UploadPanel from "@/components/UploadPanel";
import DatasetSummary from "@/components/DatasetSummary";
import ChartsPanel from "@/components/ChartsPanel";
import InsightsPanel from "@/components/InsightsPanel";
import AnomalyTable from "@/components/AnomalyTable";
import GlossaryPanel from "@/components/GlossaryPanel";
import { ParsedDataset } from "@/types/dataset";

interface HomeContentProps {
  dataset: ParsedDataset | null;
  loading: boolean;
  error: string | null;
  filename: string;
  onFile: (file: File) => Promise<void>;
}

export default function HomeContent({
  dataset,
  loading,
  error,
  filename,
  onFile,
}: HomeContentProps) {
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <img
              src="/logo - header.svg"
              alt="BAINAH Logo"
              className="logo-img-header"
            />
          </div>
          <p className="tagline">اسكتشف بياناتك في ثواني</p>
        </div>
        <div className="header-grid" aria-hidden="true" />
      </header>

      <main className="main">
        {/* Upload */}
        <section className="card upload-section">
          <h2 className="section-title">Upload Dataset</h2>
          <UploadPanel onFile={onFile} isLoading={loading} />
          {loading && (
            <div className="loading-bar">
              <div className="loading-progress" />
            </div>
          )}
          {error && <p className="error-msg">⚠ {error}</p>}
          {dataset && !loading && (
            <p className="success-msg">
              ✓ Analysed <strong>{filename}</strong> —{" "}
              {dataset.rowCount.toLocaleString()} rows, {dataset.colCount}{" "}
              columns
            </p>
          )}
        </section>

        {dataset && (
          <>
            <DatasetSummary dataset={dataset} />
            <ChartsPanel dataset={dataset} />
            <InsightsPanel insights={dataset.insights} />
            <AnomalyTable anomalies={dataset.anomalies} />
            <GlossaryPanel />
          </>
        )}

        {!dataset && !loading && (
          <div className="empty-hero">
            <p className="empty-hero-text">
              Upload a CSV to begin instant analysis
            </p>
            <div className="feature-list">
              {[
                ["◈", "Automatic column type detection"],
                ["◈", "Descriptive statistics & distributions"],
                ["◈", "Pearson correlation matrix"],
                ["◈", "Rule-based insight generation"],
                ["◈", "Z-score anomaly detection"],
              ].map(([icon, text]) => (
                <div key={text} className="feature-item">
                  <span className="feature-icon">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          BAYYNAH · بيّنة · Dataset Insight Generator · Built with Next.js &
          Recharts
        </p>
      </footer>
    </div>
  );
}
