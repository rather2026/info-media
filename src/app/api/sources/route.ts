import { NextRequest, NextResponse } from 'next/server';
import { getAllSources, createSource, deleteSource, toggleSourceActive } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sources = await getAllSources();
    return NextResponse.json({ success: true, sources });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, url_or_handle, category, language } = body;

    if (!name || !type || !url_or_handle) {
      return NextResponse.json(
        { success: false, error: 'الاسم ونوع المصدر والرابط/المعرف حقول مطلوبة' },
        { status: 400 }
      );
    }

    const created = await createSource({
      name,
      type,
      url_or_handle,
      category: category || 'general',
      language: language || 'all',
      is_active: true,
      last_fetched_at: null,
    });

    return NextResponse.json({ success: true, source: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف المصدر مفقود' }, { status: 400 });
    }

    await deleteSource(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_active } = body;

    if (!id || typeof is_active !== 'boolean') {
      return NextResponse.json({ success: false, error: 'البيانات غير صالحة' }, { status: 400 });
    }

    await toggleSourceActive(id, is_active);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
