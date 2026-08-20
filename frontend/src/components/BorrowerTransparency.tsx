import React, { useMemo, useState } from "react";
import { ScoreResult } from "../types";

type Props = { score: ScoreResult | null };

const reasonCopy: Record<string, { title: string; detail: string; action: string }> = {
  RC_HIGH_CASHFLOW_VOL: {
    title: "Recent cash flow varied more than expected",
    detail: "Month-to-month deposits and expenses showed less consistency during the review period.",
    action: "Providing a longer verified history may show a more stable pattern.",
  },
  RC_OVERDRAFT_EVENTS: {
    title: "Recent overdraft activity affected the evaluation",
    detail: "The reviewed account history included overdraft events during the last 12 months.",
    action: "A later review can reflect newer months without overdraft activity.",
  },
  RC_NSF_EVENTS: {
    title: "Returned payment activity affected the evaluation",
    detail: "The reviewed history included one or more non-sufficient-funds events.",
    action: "You may request a review if the source record is incomplete or inaccurate.",
  },
};

const fallbackReasons = ["RC_HIGH_CASHFLOW_VOL", "RC_OVERDRAFT_EVENTS"];

export function BorrowerTransparency({ score }: Props) {
  const [showRights, setShowRights] = useState(false);
  const reasons = useMemo(() => (score?.reason_codes.length ? score.reason_codes : fallbackReasons), [score]);
  const approved = score?.decision === "approve";

  return (
    <section className="borrower-shell glass" id="borrower-transparency" aria-labelledby="borrower-title">
      <div className="borrower-summary">
        <div className="overline">Borrower transparency preview</div>
        <h2 id="borrower-title">A decision people can understand—and question.</h2>
        <p className="muted">
          This is the plain-language layer generated from the same governed decision record used by the lender.
        </p>
        <div className="borrower-decision-card">
          <span className="muted">Application outcome</span>
          <strong>{score ? (approved ? "Eligible to proceed" : "Not approved at this time") : "Example decision notice"}</strong>
          <span>Reference {score?.request_id ?? "DEMO-TRANSPARENCY"}</span>
        </div>
        <button className="btn ghost-btn" type="button" aria-expanded={showRights} onClick={() => setShowRights((value) => !value)}>
          {showRights ? "Hide your rights" : "View your rights"}
        </button>
        {showRights && (
          <div className="rights-note">
            <strong>You can ask for the data used in this review.</strong>
            <p className="muted">You may dispute inaccurate source information, request human review, and receive the specific reasons that most affected the decision.</p>
          </div>
        )}
      </div>

      <div className="reason-notice">
        <div className="reason-heading"><span>What most affected this review</span><span>{reasons.length} factors</span></div>
        <div className="borrower-reasons">
          {reasons.map((code, index) => {
            const copy = reasonCopy[code] ?? {
              title: code.replaceAll("_", " ").toLowerCase(),
              detail: "This factor materially affected the model evaluation.",
              action: "Contact the lender to request the source information and a human review.",
            };
            return (
              <article key={code}>
                <span className="reason-rank">{index + 1}</span>
                <div>
                  <h3>{copy.title}</h3>
                  <p>{copy.detail}</p>
                  <small>{copy.action}</small>
                </div>
              </article>
            );
          })}
        </div>
        <div className="notice-footer">
          <span>No protected characteristic is used to generate the score.</span>
          <span>Human review available</span>
        </div>
      </div>
    </section>
  );
}
