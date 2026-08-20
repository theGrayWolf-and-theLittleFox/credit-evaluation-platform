import React, { FormEvent, useEffect, useState } from "react";
import { OutcomePayload } from "../types";

type Props = {
  applicationId?: string | null;
  onSubmit: (payload: OutcomePayload) => Promise<void>;
};

const outcomeWindows: Array<{ value: OutcomePayload["outcome_type"]; label: string; hint: string }> = [
  { value: "repayment_30d", label: "30-day payment", hint: "Early payment signal" },
  { value: "repayment_90d", label: "90-day repayment", hint: "Initial performance window" },
  { value: "repayment_180d", label: "180-day repayment", hint: "Intermediate performance" },
  { value: "repayment_12m", label: "12-month performance", hint: "Long-term risk outcome" },
];

export function OutcomeTracker({ applicationId, onSubmit }: Props) {
  const [application, setApplication] = useState(applicationId ?? "");
  const [outcomeType, setOutcomeType] = useState<OutcomePayload["outcome_type"]>("repayment_90d");
  const [outcomeValue, setOutcomeValue] = useState<0 | 1>(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (applicationId) setApplication(applicationId);
  }, [applicationId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!application.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await onSubmit({
        application_id: application.trim(),
        outcome_type: outcomeType,
        outcome_value: outcomeValue,
        extra: { observed_at: new Date().toISOString(), source: "lender_verified" },
      });
      setMessage("Outcome recorded and governance metrics refreshed.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to record this outcome.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="outcome-shell glass" aria-labelledby="outcome-title">
      <div className="outcome-copy">
        <div className="overline">Performance feedback loop</div>
        <h2 id="outcome-title">Connect decisions to what happened next.</h2>
        <p className="muted">
          Verified repayment outcomes power calibration checks, fairness monitoring, and governed retraining. Direct
          personal identifiers are not required here.
        </p>
        <div className="feedback-flow" aria-label="Outcome feedback process">
          <span>Decision</span><i>→</i><span>Observed outcome</span><i>→</i><span>Governance review</span><i>→</i><span>Approved update</span>
        </div>
      </div>

      <form className="outcome-form" onSubmit={handleSubmit}>
        <label>
          <span className="label"><span>Application identifier</span><span className="muted">required</span></span>
          <input
            className="input"
            value={application}
            onChange={(event) => setApplication(event.target.value)}
            placeholder="Scored application id"
            required
          />
        </label>
        <label>
          <span className="label"><span>Observation window</span></span>
          <select className="input" value={outcomeType} onChange={(event) => setOutcomeType(event.target.value as OutcomePayload["outcome_type"])}>
            {outcomeWindows.map((window) => <option key={window.value} value={window.value}>{window.label} — {window.hint}</option>)}
          </select>
        </label>
        <fieldset className="outcome-choice">
          <legend>Observed result</legend>
          <button type="button" className={outcomeValue === 1 ? "active positive" : ""} onClick={() => setOutcomeValue(1)}>
            <strong>Paid as agreed</strong>
            <span>Positive performance</span>
          </button>
          <button type="button" className={outcomeValue === 0 ? "active negative" : ""} onClick={() => setOutcomeValue(0)}>
            <strong>Not paid as agreed</strong>
            <span>Adverse performance</span>
          </button>
        </fieldset>
        <div className="outcome-form-footer">
          <span className={message?.startsWith("Outcome recorded") ? "positive-copy" : "muted"}>{message ?? "Append-only audit event"}</span>
          <button className="btn" type="submit" disabled={submitting || !application.trim()}>{submitting ? "Recording…" : "Record outcome"}</button>
        </div>
      </form>
    </section>
  );
}
