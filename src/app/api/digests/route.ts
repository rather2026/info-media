import { NextRequest, NextResponse } from 'next/server';
import { getRecentDigests, getRecentLogs } from '@/lib/supabase';
import { runNewsDigestPipeline } from '@/lib/summarizer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const digests = await getRecentDigests(20);
    const logs = await getRecentLogs(30);
    return NextResponse.json({ success: true, digests, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { language, model, timeSlot, skipDelivery } = body;

    const result = await runNewsDigestPipeline({
      overrideLanguage: language,
      overrideModel: model,
      timeSlot: timeSlot || 'manual',
      skipDelivery: Boolean(skipDelivery),
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
