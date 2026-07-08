/** DELETE /api/analyses/[id] — remove one saved analysis. */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.analysis.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
