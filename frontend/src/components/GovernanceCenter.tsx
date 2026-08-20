import React, { useMemo, useState } from "react";
import { dataLineage, governanceControls, monitoringSignals } from "../data/governance";
import { GovernanceSummary } from "../types";

type View = "controls" | "lineage" | "monitoring";

const viewLabels: Record<View, string> = {
  controls: "Control register",
  lineage: "Decision lineage",
  monitoring: "Monitoring signals",
};

type Props = {
  summary: GovernanceSummary | null;
  loading?: boolean;
};

export function GovernanceCenter({ summary, loading }: Props) {
  const [view, setView] = useState<View>("controls");
  const readiness = useMemo(() => {
    if (summary) return Math.round(summary.readiness * 100);
    return Math.round((governanceControls.filter((control) => control.status === "ready").length / governanceControls.length) * 100);
  }, [summary]);

  return (
    <section className="governance-shell" id="governance-center" aria-labelledby="governance-title">
      <div className="governance-header">
        <div>
          <div className="overline">Continuous governance</div>
          <h2 id="governance-title">Evidence before automation.</h2>
          <p className="muted">
            Every decision should be reproducible, reviewable, and attached to the controls that made it safe to issue.
          </p>
        </div>
        <div className="readiness-dial" aria-label={`${readiness}% controls operational`}>
          <div style={{ "--readiness": `${readiness * 3.6}deg` } as React.CSSProperties}>
            <strong>{readiness}%</strong>
          </div>
          <span>{loading ? "loading evidence" : `${summary?.event_count ?? 0} events reviewed`}</span>
        </div>
      </div>

      <div className="governance-tabs" role="tablist" aria-label="Governance views">
        {(Object.keys(viewLabels) as View[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            className={view === key ? "active" : ""}
            onClick={() => setView(key)}
          >
            {viewLabels[key]}
          </button>
        ))}
      </div>

      <div className="glass governance-body" role="tabpanel">
        {view === "controls" && (
          <div className="control-list">
            {summary && (
              <div className="live-control-strip">
                {summary.controls.map((control) => (
                  <div key={control.id}>
                    <span className={`status-dot ${control.status}`} />
                    <span>{control.label}</span>
                    <strong>{Math.round(control.value * 100)}%</strong>
                  </div>
                ))}
              </div>
            )}
            {governanceControls.map((control) => (
              <article className="control-row" key={control.id}>
                <div className="control-code">{control.id}</div>
                <div className="control-main">
                  <div className="control-meta"><span>{control.domain}</span><span>{control.owner}</span></div>
                  <h3>{control.control}</h3>
                  <p className="muted">{control.evidence}</p>
                </div>
                <span className={`status-tag ${control.status}`}>{control.status}</span>
              </article>
            ))}
          </div>
        )}

        {view === "lineage" && (
          <div className="lineage-flow">
            {dataLineage.map((item, index) => (
              <article className="lineage-node" key={item.step}>
                <div className="lineage-index">{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <h3>{item.step}</h3>
                  <p className="muted">{item.detail}</p>
                  <span className="status-tag ready">{item.state}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {view === "monitoring" && (
          <div className="signal-grid">
            {monitoringSignals.map((signal) => (
              <article className="signal-card" key={signal.label}>
                <div className="label"><span>{signal.label}</span><span className="status-tag ready">{signal.state}</span></div>
                <strong>{signal.value}</strong>
                <div className="signal-track"><div style={{ width: `${signal.level}%` }} /></div>
                <small className="muted">Observed against the current governed model window</small>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
