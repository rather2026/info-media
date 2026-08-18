import { NextRequest, NextResponse } from 'next/server';
import { runNewsDigestPipeline } from '@/lib/summarizer';
import { TimeSlot } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Validate Cron Secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const urlSecret = req.nextUrl.searchParams.get('secret');

  const isAuthorized =
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    urlSecret === cronSecret;

  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
  }

  // Determine current slot based on hour
  const currentHour = new Date().getUTCHours();
  let timeSlot: TimeSlot = 'morning';

  if (currentHour >= 12 && currentHour < 18) {
    timeSlot = 'afternoon';
  } else if (currentHour >= 18 || currentHour < 4) {
    timeSlot = 'evening';
  }

  try {
    const result = await runNewsDigestPipeline({
      timeSlot,
    });

    return NextResponse.json({
      success: true,
      timeSlot,
      executedAt: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        timeSlot,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
