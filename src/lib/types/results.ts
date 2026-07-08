/**
 * Output types: what each analysis engine returns and what the dashboard
 * and deal memo render.
 */
import type { RehabLevel, RepairCategory, RepairLevel } from './input';
import type {
  Comp,
  DataSource,
  NormalizedAddress,
  ProviderValuation,
  PublicRecord,
  RentEstimate,
  SubjectProperty,
} from './property';

/* ------------------------------- Repairs -------------------------------- */

export interface RepairLineItem {
  category: RepairCategory;
  level: RepairLevel;
  low: number;
  high: number;
  /** Conservative point estimate used in the headline number. */
  recommended: number;
  note?: string;
}

export interface RepairEstimate {
  rehabLevel: RehabLevel;
  low: number;
  high: number;
  /** Conservative recommended repair budget (leans high, never below evidence). */
  recommended: number;
  /** 0–100. Low when the scope is vague or many categories are Unknown. */
  confidence: number;
  lineItems: RepairLineItem[];
  /** Categories the user marked Unknown — drivers of uncertainty. */
  unknownCategories: RepairCategory[];
  assumptions: string[];
  warnings: string[];
}

/* ------------------------------- Grading -------------------------------- */

export type CompDisposition = 'qualified' | 'support' | 'penalized' | 'rejected';

export interface CompPenalty {
  label: string;
  /** Points subtracted from the 0–100 base score. */
  points: number;
}

export interface GradedComp {
  comp: Comp;
  /** 0–100 similarity/quality score. */
  score: number;
  disposition: CompDisposition;
  penalties: CompPenalty[];
  flags: string[];
  /** Plain-English "why accepted / penalized / rejected". */
  explanation: string;
  /** Value this comp implies for the subject (sqft-adjusted where possible). */
  impliedValue: number;
}

/* --------------------------------- ARV ---------------------------------- */

export interface ArvResult {
  low: number;
  median: number;
  high: number;
  /** The number the offers are actually built on — leans below median. */
  conservative: number;
  /** 0–100. */
  confidence: number;
  qualifiedCompCount: number;
  usedCompCount: number;
  explanation: string;
  warnings: string[];
}

/* -------------------------------- Offers -------------------------------- */

export type OfferStrategy =
  | 'wholesale'
  | 'fix_and_flip'
  | 'subject_to'
  | 'creative_finance';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'very_high';

export interface OfferResult {
  strategy: OfferStrategy;
  viable: boolean;
  /** Max allowable offer (ceiling). Null when the strategy can't be priced. */
  maxOffer: number | null;
  /** Recommended, more conservative number. */
  saferOffer: number | null;
  /** Highest defensible number, thinner margin. */
  aggressiveOffer: number | null;
  /** Flip/wholesale: projected profit. Hold strategies: may be undefined. */
  projectedProfit?: number;
  /** Hold strategies (subto / creative): monthly cash flow after debt. */
  monthlyCashFlow?: number;
  /** Equity captured at acquisition (ARV − total in). */
  equity?: number;
  riskLevel: RiskLevel;
  confidence: number;
  explanation: string;
  redFlags: string[];
  sellerQuestions: string[];
  /** Structure details for creative / subject-to (down, rate, term…). */
  terms?: Record<string, string>;
}

export interface OffersBundle {
  wholesale: OfferResult;
  fix_and_flip: OfferResult;
  subject_to: OfferResult;
  creative_finance: OfferResult;
}

/* -------------------------- Risk & Confidence --------------------------- */

export interface ScoreFactor {
  label: string;
  /** Signed contribution to the score. */
  points: number;
  detail?: string;
}

export interface RiskScore {
  /** 0–100, higher = riskier. */
  score: number;
  level: RiskLevel;
  factors: ScoreFactor[];
  summary: string;
}

export interface ConfidenceScore {
  /** 0–100, higher = more confident. */
  score: number;
  level: 'low' | 'moderate' | 'high';
  factors: ScoreFactor[];
  summary: string;
}

/* --------------------------- Recommendation ----------------------------- */

export interface StrategyRecommendation {
  strategy: OfferStrategy;
  label: string;
  rationale: string[];
  /** Ranked scores for every strategy, best first. */
  ranking: { strategy: OfferStrategy; score: number; note: string }[];
  summary: string;
}

/* ------------------------------ Deal Memo ------------------------------- */

export interface MemoSection {
  title: string;
  body: string;
}

export interface DealMemo {
  headline: string;
  sections: MemoSection[];
  redFlags: string[];
  nextQuestions: string[];
  plainText: string;
}

/* ------------------------- Provider status ------------------------------ */

/** Which data slot a provider fills. */
export type ProviderSlotType =
  | 'mock'
  | 'property'
  | 'comps'
  | 'rent'
  | 'county'
  | 'valuation';

export interface ProviderStatusEntry {
  name: string;
  type: ProviderSlotType;
  /** True when this provider's API key/credential is present. */
  configured: boolean;
  /** True when this provider is actually supplying data for this run. */
  active: boolean;
  warnings: string[];
}

/** Snapshot of how the app is configured to source data. */
export interface ProviderStatus {
  mockProviderEnabled: boolean;
  realProvidersConfigured: boolean;
  providers: ProviderStatusEntry[];
  globalWarnings: string[];
}

/* --------------------------- Source audit ------------------------------- */

/** One row of the per-analysis data-provenance audit. */
export interface SourceAuditEntry {
  /** Human-readable provider that supplied this data. */
  provider: string;
  /** The kind of data this row covers. */
  sourceType: 'property' | 'comps' | 'public_record' | 'valuation' | 'rent';
  /** True when this came from the simulated mock (never licensed data). */
  mock: boolean;
  /** ISO timestamp the data was fetched / attached. */
  fetchedAt: string;
  /** 0–100 confidence when the provider reports one. */
  confidence?: number;
  /** Plain-English description of what this source supplied. */
  supplied: string;
  warnings: string[];
}

/* ---------------------------- Full Result ------------------------------- */

export interface AnalysisResult {
  generatedAt: string;
  address: NormalizedAddress;
  subject: SubjectProperty;
  publicRecord?: PublicRecord;
  valuation?: ProviderValuation;
  rent?: RentEstimate;
  comps: GradedComp[];
  repairEstimate: RepairEstimate;
  arv: ArvResult;
  offers: OffersBundle;
  risk: RiskScore;
  confidence: ConfidenceScore;
  recommendation: StrategyRecommendation;
  memo: DealMemo;
  dataSources: DataSource[];
  /** Per-run provenance audit — one row per data source used. */
  sourceAudit: SourceAuditEntry[];
  /** How the app resolved providers for this run (mock vs. real). */
  providerStatus: ProviderStatus;
  /** True when results came from the mock provider (dev/testing). */
  usedMockProvider: boolean;
  warnings: string[];
}
