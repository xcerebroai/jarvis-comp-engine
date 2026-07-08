/**
 * The exact input shape the intake form produces and `runPropertyAnalysis`
 * consumes. Kept deliberately close to the raw form so there is no lossy
 * translation between UI and pipeline.
 */

/** Per-category repair severity. */
export type RepairLevel =
  | 'not_needed'
  | 'unknown'
  | 'minor'
  | 'moderate'
  | 'major'
  | 'full_replacement';

/** Overall rehab scope — the headline the user picks first. */
export type RehabLevel = 'cosmetic' | 'light' | 'medium' | 'heavy' | 'full_gut';

/** The 16 itemizable repair categories (camelCase = form field names). */
export type RepairCategory =
  | 'roof'
  | 'hvac'
  | 'foundation'
  | 'electrical'
  | 'plumbing'
  | 'flooring'
  | 'paint'
  | 'drywall'
  | 'kitchen'
  | 'bathrooms'
  | 'windows'
  | 'exterior'
  | 'landscaping'
  | 'trashOut'
  | 'permits'
  | 'contingency';

export type RepairCategories = Partial<Record<RepairCategory, RepairLevel>>;

export interface AddressInput {
  fullAddress?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface RepairInput {
  rehabLevel?: RehabLevel;
  repairNotes?: string;
  knownMajorRepairs?: string;
  categories?: RepairCategories;
}

export interface SellerInfoInput {
  askingPrice?: number;
  loanBalance?: number;
  monthlyPiti?: number;
  interestRate?: number;
  arrears?: number;
  reinstatementAmount?: number;
  cashToSeller?: number;
  motivation?: string;
  occupancy?: string;
  estimatedRent?: number;
}

/** Status of a manual comp, mirroring listing states (mapped in the pipeline). */
export type CompInputStatus = 'sold' | 'active' | 'pending' | 'listed';

/**
 * A user-entered comparable, used as a FALLBACK when no comps provider is
 * configured. Flows through the same grading engine as provider comps.
 */
export interface CompInput {
  address?: string;
  soldPrice?: number;
  soldDate?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  distanceMiles?: number;
  /** Free-text or one of the known PropertyCondition values. */
  condition?: string;
  status?: CompInputStatus;
  /** Where the user got this comp (MLS printout, agent, county, etc.). */
  source?: string;
  notes?: string;
}

/** The single object the whole autopilot pipeline runs on. */
export interface AnalysisInput {
  address: AddressInput;
  repairs: RepairInput;
  sellerInfo?: SellerInfoInput;
  /** Optional fallback comps when no comps provider is configured. */
  manualComps?: CompInput[];
  /** Fallback only: raw pasted text when no provider is configured. */
  manualPaste?: string;
}

/** Ordered list of all repair categories, for iterating the form/estimate. */
export const REPAIR_CATEGORIES: RepairCategory[] = [
  'roof',
  'hvac',
  'foundation',
  'electrical',
  'plumbing',
  'flooring',
  'paint',
  'drywall',
  'kitchen',
  'bathrooms',
  'windows',
  'exterior',
  'landscaping',
  'trashOut',
  'permits',
  'contingency',
];

export const REPAIR_LEVELS: RepairLevel[] = [
  'not_needed',
  'unknown',
  'minor',
  'moderate',
  'major',
  'full_replacement',
];

export const REHAB_LEVELS: RehabLevel[] = [
  'cosmetic',
  'light',
  'medium',
  'heavy',
  'full_gut',
];
