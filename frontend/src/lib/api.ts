import {
  buildDemoPortfolioApplications,
  buildDemoScorePayload,
  demoAuditEvents,
  demoExplanation,
  demoFairness,
  demoFeatureContract,
  demoHealth,
  demoGovernanceSummary,
  demoModelInfo,
  demoPortfolioAnalysis,
  demoScoreResult,
} from "../data/demo";
import {
  AuditEventList,
  AuditFilters,
  ExplainResult,
  FairnessReport,
  FairnessRow,
  FeatureContract,
  HealthResponse,
  GovernanceSummary,
  ModelInfo,
  OutcomePayload,
  PortfolioAnalysisRequest,
  PortfolioAnalysisResult,
  ScorePayload,
  ScoreResult,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API_KEY = import.meta.env.VITE_API_KEY;

export const USE_API =
  typeof import.meta.env.VITE_API_BASE_URL !== "undefined" &&
  import.meta.env.VITE_API_BASE_URL !== "" &&
  import.meta.env.VITE_API_BASE_URL !== "mock";

function buildHeaders() {
  return {
    "Content-Type": "application/json",
    ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
  };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: API_KEY ? { "X-API-Key": API_KEY } : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  const result = search.toString();
  return result ? `?${result}` : "";
}

export async function fetchHealth(): Promise<HealthResponse> {
  if (!USE_API) {
    return Promise.resolve(demoHealth);
  }
  return getJson<HealthResponse>("/health");
}

export async function fetchModelInfo(): Promise<ModelInfo> {
  if (!USE_API) {
    return Promise.resolve(demoModelInfo);
  }
  return getJson<ModelInfo>("/v1/models/current");
}

export async function fetchFeatureContract(): Promise<FeatureContract> {
  if (!USE_API) {
    return Promise.resolve(demoFeatureContract);
  }
  return getJson<FeatureContract>("/v1/features/contract");
}

export async function fetchGovernanceSummary(): Promise<GovernanceSummary> {
  if (!USE_API) {
    return Promise.resolve(demoGovernanceSummary);
  }
  return getJson<GovernanceSummary>("/v1/governance/summary");
}

export async function submitOutcome(payload: OutcomePayload): Promise<{ status: string }> {
  if (!USE_API) {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    return { status: "ok" };
  }
  return postJson<{ status: string }>("/v1/audit/events", payload);
}

export async function scoreApplicant(payload: ScorePayload): Promise<ScoreResult> {
  if (!USE_API) {
    const mockPayload = {
      ...buildDemoScorePayload(demoFeatureContract),
      ...payload,
    };
    return Promise.resolve({
      ...demoScoreResult,
      application_id: mockPayload.application_id,
      request_id: `req_mock_${Date.now()}`,
      score: Math.max(0, Math.min(1, 0.56 + Math.random() * 0.24)),
      decision: Math.random() > 0.36 ? "approve" : "deny",
      created_at: new Date().toISOString(),
    });
  }
  return postJson<ScoreResult>("/v1/score", payload);
}

export async function fetchExplanation(payload: ScorePayload): Promise<ExplainResult> {
  if (!USE_API) {
    return Promise.resolve({
      ...demoExplanation,
      application_id: payload.application_id,
      request_id: `exp_mock_${Date.now()}`,
      created_at: new Date().toISOString(),
    });
  }
  return postJson<ExplainResult>("/v1/explain", {
    application_id: payload.application_id,
    features: payload.features,
  });
}

export async function fetchFairnessReport(rows: FairnessRow[]): Promise<FairnessReport> {
  if (!USE_API) {
    return Promise.resolve(demoFairness);
  }
  return postJson<FairnessReport>("/v1/audit/fairness", { rows, positive_label: 1 });
}

export async function analyzePortfolio(
  payload: PortfolioAnalysisRequest,
): Promise<PortfolioAnalysisResult> {
  if (!USE_API) {
    return Promise.resolve({
      ...demoPortfolioAnalysis,
      applications: demoPortfolioAnalysis.applications.slice(0, payload.applications.length || 10),
    });
  }
  return postJson<PortfolioAnalysisResult>("/v1/portfolio/analyze", payload);
}

export async function fetchAuditEvents(
  limit = 20,
  filters: AuditFilters = {},
): Promise<AuditEventList> {
  if (!USE_API) {
    const filtered = demoAuditEvents.filter((event) => {
      if (filters.event_type && event.event_type !== filters.event_type) {
        return false;
      }
      if (filters.application_id && event.application_id !== filters.application_id) {
        return false;
      }
      return true;
    });
    return Promise.resolve({
      total: filtered.length,
      limit,
      offset: 0,
      events: filtered.slice(0, limit),
    });
  }
  const query = buildQueryString({
    limit,
    event_type: filters.event_type,
    application_id: filters.application_id,
  });
  return getJson<AuditEventList>(`/v1/audit/events${query}`);
}

export function buildMockPortfolioApplications(size: number) {
  return buildDemoPortfolioApplications(size, demoFeatureContract);
}
