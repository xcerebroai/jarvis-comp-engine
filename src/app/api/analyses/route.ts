/**
 * Saved analyses — server persistence (SQLite via Prisma).
 *   GET  /api/analyses  → list (newest first), same SavedAnalysis shape the UI uses
 *   POST /api/analyses  → save { id, createdAt, result }
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { summarizeResult } from '@/lib/savedAnalyses';
import type { AnalysisResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  const rows = await prisma.analysis.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  const items = rows.map((row) => ({
    summary: {
      id: row.id,
      address: row.address,
      createdAt: row.createdAt.toISOString(),
      conservativeArv: row.conservativeArv,
      repairEstimate: row.repairEstimate,
      recommendedStrategy: row.recommendedStrategy,
      recommendedLabel: row.recommendedStrategy,
      riskLevel: row.riskLevel,
      confidenceScore: row.confidenceScore,
      usedMockProvider: row.usedMockProvider,
    },
    result: JSON.parse(row.resultJson) as AnalysisResult,
  }));
  // recommendedLabel lives inside the stored result — restore the human label.
  for (const item of items) item.summary.recommendedLabel = item.result.recommendation.label;
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  let body: { id?: string; createdAt?: string; result?: AnalysisResult };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const { id, createdAt, result } = body;
  if (!id || !createdAt || !result?.arv || !result?.recommendation) {
    return NextResponse.json({ error: 'id, createdAt, and a full result are required.' }, { status: 400 });
  }

  const summary = summarizeResult(result, id, createdAt);
  await prisma.analysis.create({
    data: {
      id: summary.id,
      createdAt: new Date(createdAt),
      address: summary.address,
      conservativeArv: summary.conservativeArv,
      repairEstimate: summary.repairEstimate,
      recommendedStrategy: summary.recommendedStrategy,
      riskLevel: summary.riskLevel,
      confidenceScore: summary.confidenceScore,
      usedMockProvider: summary.usedMockProvider,
      resultJson: JSON.stringify(result),
    },
  });
  return NextResponse.json({ ok: true, id: summary.id });
}
