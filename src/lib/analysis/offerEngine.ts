/**
 * Offer engine — pure. Prices all four strategies off the CONSERVATIVE ARV and
 * the recommended repair number, and scales caution with rehab scope.
 *
 *  - Fix & flip: MAO = ARV − repairs − holding − closing − selling − profit − riskBuffer
 *  - Wholesale:  flip MAO − assignment fee (leaves room for an end buyer)
 *  - Subject-to: takes over the existing loan; scored on equity + cash flow
 *  - Creative:   seller-financed; scored on cash flow and price ≤ ARV
 *
 * Heavier rehab ⇒ larger risk buffer ⇒ lower offers, per product spec.
 */
import { OFFER_RULES, REHAB_RISK_BUFFER_PCT } from '@/config/analysisConfig';
import type {
  ArvResult,
  OfferResult,
  OffersBundle,
  RehabLevel,
  RentEstimate,
  RepairEstimate,
  RiskLevel,
  SellerInfoInput,
} from '@/lib/types';

const round1k = (n: number) => Math.round(n / 1000) * 1000;
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

const REHAB_RISK_POINTS: Record<RehabLevel, number> = {
  cosmetic: 0,
  light: 5,
  medium: 10,
  heavy: 20,
  full_gut: 30,
};

function riskLevelFrom(points: number): RiskLevel {
  if (points < 25) return 'low';
  if (points < 45) return 'moderate';
  if (points < 65) return 'high';
  return 'very_high';
}

function amortizedPayment(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12;
  if (principal <= 0) return 0;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export interface OfferEngineInput {
  arv: ArvResult;
  repairEstimate: RepairEstimate;
  sellerInfo?: SellerInfoInput;
  rent?: RentEstimate;
}

export function computeOffers(input: OfferEngineInput): OffersBundle {
  const { arv, repairEstimate, sellerInfo, rent } = input;
  const A = arv.conservative;
  const rehab = repairEstimate.rehabLevel;
  const repairs = repairEstimate.recommended;

  const holding = A * OFFER_RULES.holdingPct;
  const buyClosing = A * OFFER_RULES.purchaseClosingPct;
  const selling = A * OFFER_RULES.sellingPct;
  const desiredProfit = A * OFFER_RULES.desiredProfitPct;
  const riskBufferPct = REHAB_RISK_BUFFER_PCT[rehab];
  const riskBuffer = A * riskBufferPct;

  const rehabRisk = REHAB_RISK_POINTS[rehab];
  const valueConf = Math.round((arv.confidence + repairEstimate.confidence) / 2);
  const rentMonthly = rent?.monthlyRent ?? sellerInfo?.estimatedRent ?? 0;

  /* ------------------------------ Fix & flip ---------------------------- */
  const flipMao =
    A - repairs - holding - buyClosing - selling - desiredProfit - riskBuffer;
  const flipSafer = flipMao - A * OFFER_RULES.saferCushionPct;
  const flipAggressive =
    arv.median - repairs - holding - buyClosing - selling - desiredProfit * 0.6;
  const flipViable = flipMao > 0;
  const flipProfitAtSafer = A - flipSafer - repairs - holding - buyClosing - selling;

  let flipRiskPoints = (100 - arv.confidence) * 0.4 + rehabRisk;
  if (!flipViable) flipRiskPoints += 30;
  if (desiredProfit < A * 0.08) flipRiskPoints += 15;

  const flip: OfferResult = {
    strategy: 'fix_and_flip',
    viable: flipViable,
    maxOffer: flipViable ? round1k(flipMao) : round1k(Math.max(0, flipMao)),
    saferOffer: round1k(Math.max(0, flipSafer)),
    aggressiveOffer: round1k(Math.max(0, flipAggressive)),
    projectedProfit: Math.round(flipProfitAtSafer),
    riskLevel: riskLevelFrom(flipRiskPoints),
    confidence: Math.max(5, Math.round(valueConf * (flipViable ? 1 : 0.6))),
    explanation:
      `Off ${usd(A)} conservative ARV: minus ${usd(repairs)} repairs, ` +
      `${usd(holding + buyClosing + selling)} holding/closing/selling, ` +
      `${usd(desiredProfit)} target profit, and a ${Math.round(riskBufferPct * 100)}% ` +
      `rehab risk buffer (${usd(riskBuffer)}) → max ${usd(Math.max(0, flipMao))}. ` +
      `Recommended offer leaves an extra cushion.`,
    redFlags: [],
    sellerQuestions: [
      'Is the price flexible if we can close quickly and as-is?',
      'Are there any known issues not yet disclosed (roof, foundation, systems)?',
    ],
  };
  if (!flipViable)
    flip.redFlags.push('Costs exceed the conservative ARV — no flip margin at this ARV/repair level.');
  if (rehab === 'full_gut')
    flip.redFlags.push('Full gut — get firm contractor bids before committing.');
  if (arv.confidence < 45)
    flip.redFlags.push('Low ARV confidence — the flip margin could be overstated.');

  /* ------------------------------ Wholesale ----------------------------- */
  const fee = OFFER_RULES.wholesaleAssignmentFee;
  const wholesaleMax = flipMao - fee;
  const wholesaleSafer = wholesaleMax - A * 0.02;
  const wholesaleAggressive = flipAggressive - fee * 0.6;
  const wholesaleViable = wholesaleMax > 0;

  let wholesaleRiskPoints = (100 - arv.confidence) * 0.4 + rehabRisk + 5;
  if (!wholesaleViable) wholesaleRiskPoints += 30;

  const wholesale: OfferResult = {
    strategy: 'wholesale',
    viable: wholesaleViable,
    maxOffer: round1k(Math.max(0, wholesaleMax)),
    saferOffer: round1k(Math.max(0, wholesaleSafer)),
    aggressiveOffer: round1k(Math.max(0, wholesaleAggressive)),
    projectedProfit: fee,
    riskLevel: riskLevelFrom(wholesaleRiskPoints),
    confidence: Math.max(5, Math.round(valueConf * (wholesaleViable ? 0.95 : 0.55))),
    explanation:
      `Take the flip max (${usd(Math.max(0, flipMao))}) and leave a ${usd(fee)} assignment ` +
      `spread for an end buyer → wholesale max ${usd(Math.max(0, wholesaleMax))}. ` +
      `Your profit is the assignment fee.`,
    redFlags: wholesaleViable
      ? []
      : ['No assignment spread at this ARV/repair level — wholesale is unlikely to work.'],
    sellerQuestions: [
      'How quickly do you need to close?',
      'Would you accept a cash, as-is offer with a short inspection window?',
    ],
  };

  /* ------------------------------ Subject-to ---------------------------- */
  const subject_to = buildSubjectTo({ A, repairs, sellerInfo, rentMonthly, valueConf, rehabRisk, arvConfidence: arv.confidence });

  /* --------------------------- Creative finance ------------------------- */
  const creative_finance = buildCreativeFinance({ A, sellerInfo, rentMonthly, valueConf, rehabRisk, arvConfidence: arv.confidence });

  return { wholesale, fix_and_flip: flip, subject_to, creative_finance };
}

/* ---------------------------- strategy builders ------------------------- */

interface HoldCtx {
  A: number;
  repairs: number;
  sellerInfo?: SellerInfoInput;
  rentMonthly: number;
  valueConf: number;
  rehabRisk: number;
  arvConfidence: number;
}

function buildSubjectTo(ctx: HoldCtx): OfferResult {
  const { A, repairs, sellerInfo, rentMonthly, valueConf, rehabRisk, arvConfidence } = ctx;
  const loanBalance = sellerInfo?.loanBalance;

  if (!loanBalance) {
    return {
      strategy: 'subject_to',
      viable: false,
      maxOffer: null,
      saferOffer: null,
      aggressiveOffer: null,
      riskLevel: 'high',
      confidence: 10,
      explanation:
        'Subject-to needs the existing loan balance and monthly PITI to model. Add seller/debt info to price it.',
      redFlags: ['Missing existing-loan details (balance, PITI).'],
      sellerQuestions: [
        'What is the current mortgage balance?',
        'What is the monthly PITI payment and interest rate?',
        'Are you current on payments, or are there arrears?',
        'Is the loan assumable, or would this be a subject-to takeover?',
      ],
    };
  }

  const piti = sellerInfo?.monthlyPiti ?? Math.round((A * 0.006) / 5) * 5;
  const arrears = sellerInfo?.arrears ?? 0;
  const reinstatement = sellerInfo?.reinstatementAmount ?? 0;
  const cashToSeller = sellerInfo?.cashToSeller ?? 0;

  const entryCash = arrears + reinstatement + cashToSeller + OFFER_RULES.subjectToClosingCash;
  const totalIn = loanBalance + entryCash;
  const equity = A - totalIn - repairs;
  const reserves = rentMonthly * OFFER_RULES.reservesPctOfRent;
  const monthlyCashFlow = rentMonthly > 0 ? Math.round(rentMonthly - piti - reserves) : undefined;

  const cashFlowOk = monthlyCashFlow === undefined ? true : monthlyCashFlow >= 0;
  const viable = equity > 0 && cashFlowOk;

  let riskPoints = (100 - arvConfidence) * 0.35 + rehabRisk;
  if (equity <= 0) riskPoints += 30;
  if (monthlyCashFlow !== undefined && monthlyCashFlow < 0) riskPoints += 20;
  if (arrears > A * 0.05) riskPoints += 10;

  const redFlags: string[] = ['Due-on-sale clause risk — lender could call the loan.'];
  if (equity <= 0) redFlags.push('Negative equity after repairs at this ARV.');
  if (monthlyCashFlow !== undefined && monthlyCashFlow < 0)
    redFlags.push('Negative monthly cash flow at the estimated rent.');
  if (rentMonthly === 0) redFlags.push('No rent estimate — cash flow not yet verified.');
  if (arrears > 0) redFlags.push(`Arrears of ${usd(arrears)} must be reinstated up front.`);

  return {
    strategy: 'subject_to',
    viable,
    maxOffer: round1k(Math.max(0, entryCash)),
    saferOffer: round1k(Math.max(0, entryCash - A * 0.01)),
    aggressiveOffer: null,
    equity: Math.round(equity),
    monthlyCashFlow,
    riskLevel: riskLevelFrom(riskPoints),
    confidence: Math.max(5, Math.round(valueConf * (rentMonthly ? 0.9 : 0.7) * (viable ? 1 : 0.7))),
    explanation:
      `Take over the ${usd(loanBalance)} loan (PITI ${usd(piti)}/mo) with ${usd(entryCash)} cash in ` +
      `(arrears/reinstatement/cash-to-seller/closing). Total basis ${usd(totalIn)} vs ${usd(A)} ARV ⇒ ` +
      `${usd(equity)} equity` +
      (monthlyCashFlow !== undefined ? ` and ${usd(monthlyCashFlow)}/mo cash flow.` : '.'),
    redFlags,
    sellerQuestions: [
      'Are you current on the mortgage, or are there arrears to reinstate?',
      'What monthly payment, rate, and balance are on the existing loan?',
      'How much cash do you actually need to walk away?',
      'Are you okay leaving the loan in your name (subject-to)?',
    ],
    terms: {
      existingLoanBalance: usd(loanBalance),
      monthlyPITI: usd(piti),
      cashIn: usd(entryCash),
      totalBasis: usd(totalIn),
    },
  };
}

function buildCreativeFinance(ctx: Omit<HoldCtx, 'repairs'>): OfferResult {
  const { A, sellerInfo, rentMonthly, valueConf, rehabRisk, arvConfidence } = ctx;

  // Creative finance is only real if the seller has signaled terms. With none,
  // the numbers below are pure assumptions — flag it and cut confidence.
  const hasSellerTerms = Boolean(
    sellerInfo &&
      (sellerInfo.askingPrice ||
        sellerInfo.interestRate ||
        sellerInfo.loanBalance ||
        sellerInfo.monthlyPiti ||
        sellerInfo.cashToSeller),
  );

  const asking = sellerInfo?.askingPrice;
  const price = Math.min(asking ?? A, A); // never pay above conservative ARV
  const down = price * OFFER_RULES.creativeDownPct;
  const financed = price - down;
  const rate =
    sellerInfo?.interestRate != null
      ? sellerInfo.interestRate / 100
      : OFFER_RULES.creativeTargetRate;
  const monthlyPI = amortizedPayment(financed, rate, OFFER_RULES.creativeTermMonths);
  const taxIns = (price * OFFER_RULES.taxInsPctOfPrice) / 12;
  const reserves = rentMonthly * OFFER_RULES.reservesPctOfRent;
  const monthlyCashFlow =
    rentMonthly > 0 ? Math.round(rentMonthly - monthlyPI - taxIns - reserves) : undefined;

  const cashFlowOk = monthlyCashFlow === undefined ? true : monthlyCashFlow >= 0;
  const viable = price <= A && cashFlowOk;

  let riskPoints = (100 - arvConfidence) * 0.35 + rehabRisk + 5;
  if (monthlyCashFlow !== undefined && monthlyCashFlow < 0) riskPoints += 20;
  if ((sellerInfo?.loanBalance ?? 0) > 0) riskPoints += 10;

  const redFlags: string[] = [];
  if (!hasSellerTerms)
    redFlags.push(
      'No seller terms provided — creative finance needs the seller’s price, rate, and down-payment expectations to price accurately. Gather terms before relying on this.',
    );
  if ((sellerInfo?.loanBalance ?? 0) > 0)
    redFlags.push('Seller has an existing loan — a wrap/creative note carries due-on-sale risk.');
  if (monthlyCashFlow !== undefined && monthlyCashFlow < 0)
    redFlags.push('Negative cash flow at these terms and rent.');
  if (rentMonthly === 0) redFlags.push('No rent estimate — cash flow not yet verified.');
  if (asking && asking > A)
    redFlags.push(`Asking (${usd(asking)}) is above conservative ARV — capped price at ${usd(A)}.`);

  return {
    strategy: 'creative_finance',
    viable,
    maxOffer: round1k(price),
    saferOffer: round1k(price * 0.97),
    aggressiveOffer: round1k(Math.min(asking ?? A, A)),
    equity: Math.round(A - price),
    monthlyCashFlow,
    riskLevel: riskLevelFrom(riskPoints),
    confidence: Math.max(
      5,
      Math.round(valueConf * (rentMonthly ? 0.85 : 0.65) * (viable ? 1 : 0.7) * (hasSellerTerms ? 1 : 0.7)),
    ),
    explanation:
      `Seller-financed at ${usd(price)} with ${Math.round(OFFER_RULES.creativeDownPct * 100)}% down ` +
      `(${usd(down)}), ${(rate * 100).toFixed(1)}% over ${OFFER_RULES.creativeTermMonths / 12} yrs ⇒ ` +
      `P&I ${usd(monthlyPI)}/mo` +
      (monthlyCashFlow !== undefined ? `, ${usd(monthlyCashFlow)}/mo cash flow after taxes/reserves.` : '.'),
    redFlags,
    sellerQuestions: [
      'Would you consider carrying the financing (seller note)?',
      'What down payment and monthly payment would you need?',
      'Is there an existing loan that must be paid off at closing?',
      'Are you open to a balloon in 3–7 years?',
    ],
    terms: {
      price: usd(price),
      down: usd(down),
      rate: `${(rate * 100).toFixed(1)}%`,
      termYears: `${OFFER_RULES.creativeTermMonths / 12}`,
      monthlyPI: usd(monthlyPI),
    },
  };
}
