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
  low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  moderate: 'text-amber-700 bg-amber-50 border-amber-200',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  very_high: 'text-red-700 bg-red-50 border-red-200',
};

export function money(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

export function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
