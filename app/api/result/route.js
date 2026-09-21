import { NextResponse } from 'next/server';
import { saveResult } from '@/lib/sheet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  const id = String(b?.id ?? '');
  const score = Number(b?.score);
  const attempts = Number(b?.attempts);
  if (!/^[0-9a-f]{8}$/.test(id) || !(score >= 0 && score <= 3) || !(attempts >= 0 && attempts < 1000)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }
  try {
    const ok = await saveResult({ id, score, attempts });
    return NextResponse.json({ ok });
  } catch (e) {
    console.error('[result] could not write Excel file:', e.message);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }
}
