/**
 * Display labels and formatters shared by the UI. Pure — no React.
 */
import type {
  OfferStrategy,
  RehabLevel,
  RepairCategory,
  RepairLevel,
  RiskLevel,
} from '@/lib/types';

export const REHAB_LEVEL_LABEL: Record<RehabLevel, string> = {
  cosmetic: 'Cosmetic',
  light: 'Light rehab',
  medium: 'Medium rehab',
  heavy: 'Heavy rehab',
  full_gut: 'Full gut',
};

export const REPAIR_LEVEL_LABEL: Record<RepairLevel, string> = {
  not_needed: 'Not needed',
  unknown: 'Unknown',
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  full_replacement: 'Full replacement',
};

export const REPAIR_CATEGORY_LABEL: Record<RepairCategory, string> = {
  roof: 'Roof',
  hvac: 'HVAC',
  foundation: 'Foundation',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  flooring: 'Flooring',
  paint: 'Paint',
  drywall: 'Drywall',
  kitchen: 'Kitchen',
  bathrooms: 'Bathrooms',
  windows: 'Windows',
  exterior: 'Exterior',
  landscaping: 'Landscaping',
  trashOut: 'Trash out',
  permits: 'Permits',
  contingency: 'Contingency',
};

export const STRATEGY_LABEL: Record<OfferStrategy, string> = {
  wholesale: 'Wholesale',
  fix_and_flip: 'Fix & Flip',
  subject_to: 'Subject-To',
  creative_finance: 'Creative Finance',
};

export const OCCUPANCY_OPTIONS = ['Vacant', 'Owner-occupied', 'Tenant-occupied'];
export const MOTIVATION_OPTIONS = ['Low', 'Moderate', 'High', 'Testing the market'];

export const RISK_TONE: Record<RiskLevel, string> = {
  low: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  moderate: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
  high: 'text-orange-300 bg-orange-400/10 border-orange-400/30',
  very_high: 'text-red-300 bg-red-400/10 border-red-400/30',
};

/** Map a risk level to a command-card accent tone. */
export const RISK_TONE_ACCENT: Record<RiskLevel, 'emerald' | 'amber' | 'red'> = {
  low: 'emerald',
  moderate: 'amber',
  high: 'amber',
  very_high: 'red',
};

export function money(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

/** Qualitative confidence word for pills/labels. Mock always reads "Testing Only". */
export function confidenceWord(score: number, usedMock = false): string {
  if (usedMock) return 'Testing Only';
  if (score >= 70) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}

export function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
