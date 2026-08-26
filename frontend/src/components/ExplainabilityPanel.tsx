import React, { useMemo } from "react";
import { ExplainResult, FeatureContract } from "../types";

type Props = {
  contract: FeatureContract | null;
  explanation: ExplainResult | null;
  scoreRequestId?: string | null;
};

export function ExplainabilityPanel({ contract, explanation, scoreRequestId }: Props) {
  const sortedContributions = useMemo(() => {
    if (!explanation) {
      return [];
    }

    const labels = new Map(contract?.feature_definitions.map((definition) => [definition.name, definition.label]) ?? []);
    return Object.entries(explanation.contributions)
      .map(([featureName, contribution]) => ({
        featureName,
        label: labels.get(featureName) ?? featureName,
        contribution,
      }))
      .sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution));
  }, [contract, explanation]);

  const maxMagnitude = Math.max(...sortedContributions.map((row) => Math.abs(row.contribution)), 0.001);

  return (
    <section className="glass card">
      <div className="section-title">
        <span className="badge">Explainability</span>
        <span className="muted">{explanation ? explanation.method : "run an explanation request"}</span>
      </div>

      {explanation ? (
        <>
          <div className="meta-strip">
            <span className="chip">Explain request: {explanation.request_id}</span>
            <span className="chip">Application: {explanation.application_id}</span>
            {scoreRequestId && <span className="chip">Latest score request: {scoreRequestId}</span>}
          </div>

          <p className="muted explanation-note">
            Log-odds movement versus the reference profile in the feature contract. Positive values push toward
            approval; the values sum to the gap between this applicant and a typical one.
          </p>

          <div className="explanation-stack">
            {sortedContributions.map((row) => {
              const width = `${(Math.abs(row.contribution) / maxMagnitude) * 100}%`;
              const toneClass = row.contribution >= 0 ? "positive-bar" : "negative-bar";
              return (
                <div key={row.featureName} className="explanation-row">
                  <div className="label">
                    <span>{row.label}</span>
                    <span className={row.contribution >= 0 ? "positive-copy" : "negative-copy"}>
                      {row.contribution >= 0 ? "+" : ""}
                      {row.contribution.toFixed(3)}
                    </span>
                  </div>
                  <div className="explanation-bar-track">
                    <div className={`explanation-bar ${toneClass}`} style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="muted">
          Explanations show how far each input moves the decision relative to the reference profile published in the
          feature contract. Use “Explain only” or score an applicant first.
        </p>
      )}
    </section>
  );
}
