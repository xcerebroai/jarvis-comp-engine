/**
 * Saved analysis history — a simple, local (localStorage) store so the user can
 * save a completed analysis, see it later on the dashboard, and reopen it.
 *
 * The pure helpers (summarizeResult / serialize / deserialize) carry the logic
 * and are unit-testable; the load/persist wrappers are thin localStorage I/O.
 */
import type { AnalysisResult, OfferStrategy, RiskLevel } from '@/lib/types';

/** Compact card shown in the saved-analyses list. */
export interface SavedAnalysisSummary {
  id: string;
  address: string;
  createdAt: string;
  conservativeArv: number;
  repairEstimate: number;
  recommendedStrategy: OfferStrategy;
  recommendedLabel: string;
  riskLevel: RiskLevel;
  confidenceScore: number;
  usedMockProvider: boolean;
}

/** A saved item = its summary plus the full result (so it can be reopened). */
export interface SavedAnalysis {
  summary: SavedAnalysisSummary;
  result: AnalysisResult;
}

const STORAGE_KEY = 'jarvis.savedAnalyses.v1';
const MAX_ITEMS = 50;

/** Pure: derive the list-card summary from a full result. */
export function summarizeResult(
  result: AnalysisResult,
  id: string,
  createdAt: string,
): SavedAnalysisSummary {
  return {
    id,
    address: result.address.formatted || 'Unknown address',
    createdAt,
    conservativeArv: result.arv.conservative,
    repairEstimate: result.repairEstimate.recommended,
    recommendedStrategy: result.recommendation.strategy,
    recommendedLabel: result.recommendation.label,
    riskLevel: result.risk.level,
    confidenceScore: result.confidence.score,
    usedMockProvider: result.usedMockProvider,
  };
}

export function serializeSaved(items: SavedAnalysis[]): string {
  return JSON.stringify(items);
}

/** Pure + defensive: tolerate missing/corrupt storage without throwing. */
export function deserializeSaved(raw: string | null): SavedAnalysis[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SavedAnalysis =>
        Boolean(x) && typeof x === 'object' && 'summary' in x && 'result' in x,
    );
  } catch {
    return [];
  }
}

export function loadSaved(): SavedAnalysis[] {
  if (typeof window === 'undefined') return [];
  return deserializeSaved(window.localStorage.getItem(STORAGE_KEY));
}

export function persistSaved(items: SavedAnalysis[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, serializeSaved(items.slice(0, MAX_ITEMS)));
}

/** Save a result to the front of the list (newest first) and persist. */
export function addSaved(result: AnalysisResult, id: string, createdAt: string): SavedAnalysis[] {
  const item: SavedAnalysis = { summary: summarizeResult(result, id, createdAt), result };
  const next = [item, ...loadSaved().filter((s) => s.summary.id !== id)].slice(0, MAX_ITEMS);
  persistSaved(next);
  emit();
  return next;
}

export function removeSaved(id: string): SavedAnalysis[] {
  const next = loadSaved().filter((s) => s.summary.id !== id);
  persistSaved(next);
  emit();
  return next;
}

/* ------------------------ reactive store (client) ----------------------- */
// A tiny external store so React can read saved history via useSyncExternalStore
// — hydration-safe (empty on the server) and no setState-in-effect.

const EMPTY: SavedAnalysis[] = [];
const listeners = new Set<() => void>();
let snapshot: SavedAnalysis[] | null = null;

function emit(): void {
  snapshot = null; // invalidate so the next read re-loads from storage
  for (const l of listeners) l();
}

export function subscribeSaved(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Cached snapshot with a stable reference until the next mutation. */
export function getSavedSnapshot(): SavedAnalysis[] {
  if (snapshot === null) snapshot = loadSaved();
  return snapshot;
}

/** Server render (and hydration) always starts empty — no localStorage there. */
export function getServerSavedSnapshot(): SavedAnalysis[] {
  return EMPTY;
}
