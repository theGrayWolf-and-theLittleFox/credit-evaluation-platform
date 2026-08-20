import React, { useState } from "react";

type Phase = {
  number: string;
  title: string;
  window: string;
  summary: string;
  deliverables: string[];
};

type Objective = {
  id: "framework" | "platform";
  eyebrow: string;
  title: string;
  description: string;
  duration: string;
  outcome: string;
  phases: Phase[];
};

const objectives: Objective[] = [
  {
    id: "framework",
    eyebrow: "Objective 01",
    title: "Open-source alternative-data credit framework",
    description:
      "Build an auditable evaluation framework for thin-file and credit-invisible applicants using consumer-permissioned rent, utility, and cash-flow signals.",
    duration: "Months 1–27",
    outcome: "Public, pilot-validated framework",
    phases: [
      {
        number: "01",
        title: "Data infrastructure & governance",
        window: "Months 1–5",
        summary: "Secure ingestion, lineage, access controls, and lawful-use protocols for alternative financial data.",
        deliverables: ["Encrypted data environment", "Governance protocol", "Data-quality risk register"],
      },
      {
        number: "02",
        title: "Interpretable indicators",
        window: "Months 6–10",
        summary: "Standardize raw histories into stable, explainable measures of payment behavior and cash-flow resilience.",
        deliverables: ["Feature library", "Proxy-risk review", "Drift and anomaly checks"],
      },
      {
        number: "03",
        title: "Responsible model development",
        window: "Months 11–16",
        summary: "Compare interpretable and ensemble models across accuracy, calibration, subgroup stability, and explanation quality.",
        deliverables: ["Model benchmarks", "Fairness mitigation", "Borrower-readable reason codes"],
      },
      {
        number: "04",
        title: "Validation & regulatory readiness",
        window: "Months 17–20",
        summary: "Stress-test model behavior, fairness, and explanations across borrower groups and economic scenarios.",
        deliverables: ["Validation report", "Model cards", "Approval and change controls"],
      },
      {
        number: "05",
        title: "Community lender pilot",
        window: "Months 21–24",
        summary: "Evaluate workflow fit, decision outcomes, and explanation clarity with a mission-driven lending partner.",
        deliverables: ["Pilot integration", "Live monitoring", "Stakeholder evaluation"],
      },
      {
        number: "06",
        title: "Open-source release",
        window: "Months 25–27",
        summary: "Publish production-oriented code, governance artifacts, implementation guidance, and contributor standards.",
        deliverables: ["Public repository", "Compliance templates", "Adoption toolkit"],
      },
    ],
  },
  {
    id: "platform",
    eyebrow: "Objective 02",
    title: "Real-time decisioning & continuous governance",
    description:
      "Transform the framework into secure, low-latency infrastructure that community lenders can deploy without building an in-house machine-learning team.",
    duration: "Months 28–36",
    outcome: "Multi-institution community deployment",
    phases: [
      {
        number: "07",
        title: "Real-time decision infrastructure",
        window: "Months 28–30",
        summary: "Harden scoring and explanation APIs with authentication, observability, fault tolerance, and audit trails.",
        deliverables: ["Secure inference API", "Lender sandbox", "Integration toolkit"],
      },
      {
        number: "08",
        title: "Continuous model governance",
        window: "Months 31–33",
        summary: "Monitor drift, calibration, subgroup outcomes, and model changes with human review and rollback controls.",
        deliverables: ["Fairness dashboard", "Retraining workflow", "Periodic compliance reports"],
      },
      {
        number: "09",
        title: "Community deployment & transparency",
        window: "Months 34–36",
        summary: "Expand institutional adoption while equipping borrowers with clear explanations, rights, and dispute pathways.",
        deliverables: ["3+ lender deployments", "Multilingual borrower guides", "Community workshops"],
      },
    ],
  },
];

export function ProgramRoadmap() {
  const [selectedId, setSelectedId] = useState<Objective["id"]>("framework");
  const selected = objectives.find((objective) => objective.id === selectedId) ?? objectives[0];

  return (
    <section className="program-shell" id="program-roadmap" aria-labelledby="program-title">
      <div className="program-heading">
        <div>
          <div className="overline">36-month implementation program</div>
          <h2 id="program-title">From inclusive signals to accountable decisions.</h2>
        </div>
        <p className="muted">
          Two connected initiatives move the work from open, inspectable research infrastructure to reliable
          institutional deployment—with fairness and compliance built into every release gate.
        </p>
      </div>

      <div className="objective-switcher" role="tablist" aria-label="Program objectives">
        {objectives.map((objective) => (
          <button
            key={objective.id}
            type="button"
            role="tab"
            aria-selected={selectedId === objective.id}
            className={`objective-tab ${selectedId === objective.id ? "active" : ""}`}
            onClick={() => setSelectedId(objective.id)}
          >
            <span className="objective-index">{objective.eyebrow}</span>
            <span>{objective.title}</span>
            <span className="objective-duration">{objective.duration}</span>
          </button>
        ))}
      </div>

      <div className="glass roadmap-panel" role="tabpanel">
        <div className="roadmap-intro">
          <div>
            <span className="badge">{selected.duration}</span>
            <h3>{selected.title}</h3>
            <p className="muted">{selected.description}</p>
          </div>
          <div className="outcome-card">
            <span className="overline">Target outcome</span>
            <strong>{selected.outcome}</strong>
          </div>
        </div>

        <div className="phase-grid">
          {selected.phases.map((phase) => (
            <article className="phase-card" key={phase.number}>
              <div className="phase-card-top">
                <span className="phase-number">{phase.number}</span>
                <span className="phase-window">{phase.window}</span>
              </div>
              <h4>{phase.title}</h4>
              <p className="muted">{phase.summary}</p>
              <ul>
                {phase.deliverables.map((deliverable) => (
                  <li key={deliverable}>{deliverable}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div className="guardrail-strip" aria-label="Program safeguards">
        <div><span>01</span><strong>Consumer-permissioned data</strong><small>Purpose-bound and traceable</small></div>
        <div><span>02</span><strong>Fairness at every gate</strong><small>Measured before and after release</small></div>
        <div><span>03</span><strong>Explanations by design</strong><small>Borrower- and examiner-ready</small></div>
        <div><span>04</span><strong>Human accountability</strong><small>Review, override, and appeal paths</small></div>
      </div>
    </section>
  );
}
