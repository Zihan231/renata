import { NextResponse } from 'next/server';
import { addParticipant } from '@/lib/sheet';
import { normalizeBdPhone } from '@/lib/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  const name = String(body?.name ?? '').trim().slice(0, 40);
  const phone = normalizeBdPhone(body?.phone);
  if (name.length < 2 || !phone) {
    return NextResponse.json({ error: 'Invalid name or Bangladesh phone number' }, { status: 400 });
  }
  try {
    const id = await addParticipant({ name, phone });
    return NextResponse.json({ id });
  } catch (e) {
    console.error('[register] could not write Excel file:', e.message);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }
}
