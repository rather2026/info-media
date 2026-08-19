import { NextRequest, NextResponse } from 'next/server';
import { testSupabaseConnection } from '@/lib/supabase';
import { testOpenRouterConnection } from '@/lib/openrouter';
import { testXFetching } from '@/lib/fetchers/x-scraper';
import { testTelegramConnection } from '@/lib/telegram';
import { testWhatsAppConnection } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const service = body.service || 'all';

    const results: Record<string, any> = {};

    if (service === 'all' || service === 'supabase') {
      results.supabase = await testSupabaseConnection();
    }

    if (service === 'all' || service === 'openrouter') {
      results.openrouter = await testOpenRouterConnection(body.model);
    }

    if (service === 'all' || service === 'x_scraper') {
      results.x_scraper = await testXFetching(body.handle || '@AJABreaking');
    }

    if (service === 'all' || service === 'telegram') {
      results.telegram = await testTelegramConnection();
    }

    if (service === 'all' || service === 'whatsapp') {
      results.whatsapp = await testWhatsAppConnection();
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
