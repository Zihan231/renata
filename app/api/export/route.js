import { NextResponse } from 'next/server';
import { readFileBuffer } from '@/lib/sheet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Download the sheet. If ADMIN_KEY is set in .env.local, ?key=<ADMIN_KEY> is required; if not set it is open.
export async function GET(req) {
  const key = new URL(req.url).searchParams.get('key');
  if (process.env.ADMIN_KEY && key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const buf = await readFileBuffer();
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="renata-quiz-participants.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
