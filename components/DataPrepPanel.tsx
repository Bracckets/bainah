"use client";

import AppSelect from "@/components/AppSelect";
import type {
  ColumnMeta,
  ColumnType,
  DataPrepConfig,
  MissingValueStrategy,
} from "@/types/dataset";

interface Props {
  sourceColumns: ColumnMeta[];
  prepConfig: DataPrepConfig;
  onToggleColumn: (columnName: string) => void;
  onTypeOverrideChange: (columnName: string, nextType: ColumnType | "") => void;
  onMissingStrategyChange: (strategy: MissingValueStrategy) => void;
  onReset: () => void;
}

const TYPE_OPTIONS: { value: ColumnType; label: string }[] = [
  { value: "numeric", label: "Numeric" },
  { value: "categorical", label: "Categorical" },
  { value: "datetime", label: "Datetime" },
  { value: "text", label: "Text" },
];

const MISSING_OPTIONS: { value: MissingValueStrategy; label: string }[] = [
  { value: "keep", label: "Keep missing values" },
  { value: "drop-rows", label: "Drop incomplete rows" },
  { value: "fill-by-type", label: "Fill by column type" },
];

export default function DataPrepPanel({
  sourceColumns,
  prepConfig,
  onToggleColumn,
  onTypeOverrideChange,
  onMissingStrategyChange,
  onReset,
}: Props) {
  const hiddenCount = prepConfig.hiddenColumns.length;
  const overrideCount = Object.keys(prepConfig.typeOverrides).length;

  return (
    <section className="workspace-panel">
      <div className="workspace-panel-head">
        <div>
          <p className="panel-kicker">Data prep</p>
          <h2 className="panel-title">Adjust structure before analysis</h2>
        </div>
        <p className="panel-note">
          Hide columns, override types, and choose one missing-data rule before the
          rest of Bayynah recomputes.
        </p>
      </div>

      <div className="prep-toolbar">
        <div className="prep-toolbar-main">
          <div className="prep-select-block">
            <span className="prep-label">Missing-data rule</span>
            <AppSelect
              value={prepConfig.missingStrategy}
              options={MISSING_OPTIONS}
              onChange={(value) =>
                onMissingStrategyChange(value as MissingValueStrategy)
              }
              className="prep-select"
            />
          </div>
          <div className="workspace-chip-row">
            <span className="workspace-chip">{sourceColumns.length} source columns</span>
            <span className="workspace-chip">{hiddenCount} hidden</span>
            <span className="workspace-chip">{overrideCount} type overrides</span>
          </div>
        </div>

        <button className="sidebar-action prep-reset" onClick={onReset}>
          Reset prep
        </button>
      </div>

      <div className="prep-column-list">
        {sourceColumns.map((column) => {
          const isHidden = prepConfig.hiddenColumns.includes(column.name);
          const selectedType = prepConfig.typeOverrides[column.name] ?? column.type;

          return (
            <div key={column.name} className="prep-column-row">
              <div className="prep-column-copy">
                <p className="prep-column-name">{column.name}</p>
                <p className="prep-column-meta">
                  {column.uniqueCount.toLocaleString()} unique · {column.missingCount.toLocaleString()} missing
                </p>
              </div>

              <div className="prep-column-controls">
                <button
                  className={`prep-visibility-toggle ${
                    isHidden ? "prep-visibility-toggle--muted" : "prep-visibility-toggle--active"
                  }`}
                  onClick={() => onToggleColumn(column.name)}
                >
                  {isHidden ? "Hidden" : "Visible"}
                </button>

                <AppSelect
                  value={selectedType}
                  options={TYPE_OPTIONS}
                  onChange={(value) =>
                    onTypeOverrideChange(column.name, value as ColumnType)
                  }
                  className="prep-type-select"
                />

                {prepConfig.typeOverrides[column.name] && (
                  <button
                    className="prep-clear-type"
                    onClick={() => onTypeOverrideChange(column.name, "")}
                  >
                    Clear override
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
