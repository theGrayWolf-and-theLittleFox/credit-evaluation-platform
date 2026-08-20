import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AuditFilters,
  ExplainResult,
  FairnessReport,
  PortfolioAnalysisResult,
  PortfolioApplicationInput,
  ScorePayload,
  ScoreResult,
  OutcomePayload,
} from "./types";
import {
  USE_API,
  analyzePortfolio,
  fetchAuditEvents,
  fetchExplanation,
  fetchFeatureContract,
  fetchHealth,
  fetchGovernanceSummary,
  fetchModelInfo,
  scoreApplicant,
  submitOutcome,
} from "./lib/api";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { ScoreForm } from "./components/ScoreForm";
import { MetricsGrid } from "./components/MetricsGrid";
import { AuditTable } from "./components/AuditTable";
import { FairnessPanel } from "./components/FairnessPanel";
import { ExplainabilityPanel } from "./components/ExplainabilityPanel";
import { PortfolioWorkbench } from "./components/PortfolioWorkbench";
import { ProgramRoadmap } from "./components/ProgramRoadmap";
import { GovernanceCenter } from "./components/GovernanceCenter";
import { BorrowerTransparency } from "./components/BorrowerTransparency";
import { OutcomeTracker } from "./components/OutcomeTracker";

export default function App() {
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [explanation, setExplanation] = useState<ExplainResult | null>(null);
  const [fairness, setFairness] = useState<FairnessReport | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isAnalyzingPortfolio, setIsAnalyzingPortfolio] = useState(false);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({});

  const deferredApplicationId = useDeferredValue(auditFilters.application_id ?? "");
  const mode = USE_API ? "live" : "mock";

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  const modelQuery = useQuery({
    queryKey: ["model-info"],
    queryFn: fetchModelInfo,
  });

  const contractQuery = useQuery({
    queryKey: ["feature-contract"],
    queryFn: fetchFeatureContract,
  });

  const auditQuery = useQuery({
    queryKey: ["audit-events", auditFilters.event_type ?? "", deferredApplicationId],
    queryFn: async () =>
      fetchAuditEvents(25, {
        ...auditFilters,
        application_id: deferredApplicationId || undefined,
      }),
  });
  const { refetch: refetchAudit } = auditQuery;

  const hasLoadedContract = useMemo(() => Boolean(contractQuery.data?.feature_definitions.length), [contractQuery.data]);
  const fairnessSignature = fairness ? fairness.groups.join("|") : "";
  const portfolioSize = portfolio?.summary.total_applications ?? 0;

  const governanceQuery = useQuery({
    queryKey: ["governance-summary", score?.request_id, fairnessSignature],
    queryFn: fetchGovernanceSummary,
  });

  useEffect(() => {
    refetchAudit();
  }, [score?.request_id, explanation?.request_id, fairnessSignature, portfolioSize, refetchAudit]);

  async function handleScore(payload: ScorePayload) {
    try {
      setIsScoring(true);
      setError(null);
      const result = await scoreApplicant(payload);
      startTransition(() => {
        setScore(result);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to score applicant");
    } finally {
      setIsScoring(false);
    }
  }

  async function handleExplain(payload: ScorePayload) {
    try {
      setIsExplaining(true);
      setError(null);
      const result = await fetchExplanation(payload);
      startTransition(() => {
        setExplanation(result);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to explain applicant");
    } finally {
      setIsExplaining(false);
    }
  }

  async function handlePortfolioRun(applications: PortfolioApplicationInput[], groupKey: string) {
    try {
      setIsAnalyzingPortfolio(true);
      setError(null);
      const result = await analyzePortfolio({
        applications,
        group_key: groupKey,
        top_reason_count: 5,
      });
      startTransition(() => {
        setPortfolio(result);
        if (result.fairness) {
          setFairness(result.fairness);
        }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze portfolio");
    } finally {
      setIsAnalyzingPortfolio(false);
    }
  }

  async function handleOutcome(payload: OutcomePayload) {
    await submitOutcome(payload);
    await Promise.all([refetchAudit(), governanceQuery.refetch()]);
  }

  return (
    <div className="app-shell">
      <Navbar mode={mode} onPrimaryAction={() => document.getElementById("score-workbench")?.scrollIntoView({ behavior: "smooth" })} />
      <Hero
        health={healthQuery.data}
        modelInfo={modelQuery.data}
        contract={contractQuery.data}
        mode={mode}
      />

      <ProgramRoadmap />

      <MetricsGrid score={score} fairness={fairness} />

      <BorrowerTransparency score={score} />

      {error && <div className="error-banner">{error}</div>}

      <ScoreForm
        contract={contractQuery.data ?? null}
        onScore={handleScore}
        onExplain={handleExplain}
        loadingScore={isScoring}
        loadingExplain={isExplaining}
      />

      <div className="grid two-column-layout">
        <ExplainabilityPanel
          contract={contractQuery.data ?? null}
          explanation={explanation}
          scoreRequestId={score?.request_id ?? null}
        />
        <FairnessPanel onFairness={(report) => startTransition(() => setFairness(report))} />
      </div>

      <PortfolioWorkbench
        contract={contractQuery.data ?? null}
        loading={isAnalyzingPortfolio}
        result={portfolio}
        onRun={handlePortfolioRun}
      />

      <OutcomeTracker applicationId={score?.application_id} onSubmit={handleOutcome} />

      <GovernanceCenter summary={governanceQuery.data ?? null} loading={governanceQuery.isLoading} />

      <AuditTable
        events={auditQuery.data?.events ?? []}
        total={auditQuery.data?.total}
        loading={auditQuery.isLoading || auditQuery.isFetching}
        filters={auditFilters}
        onFiltersChange={setAuditFilters}
      />

      {!hasLoadedContract && (
        <div className="muted" style={{ marginTop: 14 }}>
          Feature contract unavailable. Set `VITE_API_BASE_URL` to use the live backend, or keep `mock` mode for demo flows.
        </div>
      )}
    </div>
  );
}
