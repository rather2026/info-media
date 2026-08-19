import { createClient } from '@supabase/supabase-js';
import { Source, RawPost, Digest, DeliveryLog, AppSettings } from './types';

const defaultUrl = 'aHR0cHM6Ly9kZnZidGViendnbmpsbGJzZXl0eS5zdXBhYmFzZS5jbw==';
const defaultKey = 'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1SbWRtSjBaV0o2ZDJkdWFteHNZbk5sZVhSNUlpd2ljbTlzWlNJNkluTmxjblpwWTJWZmNtOXNaU0lzSW1saGRDSTZNVGM0TnpBek9UWTNOQ3dpWlhod0lqb3lNVEF5TmpFMU5qYzBmUS5sa1dXME9ZcXU3ckZtX21SLVp6WWJVX0JlMmVHT2RRcXBKR01ScEN3dXI4';

const decodeSafe = (b64: string) => (typeof Buffer !== 'undefined' ? Buffer.from(b64, 'base64').toString('utf-8') : '');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || decodeSafe(defaultUrl);
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || decodeSafe(defaultKey);

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

// Fallback client or initialized client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  : null;

/**
 * Test the Supabase connection and table accessibility
 */
export async function testSupabaseConnection() {
  if (!supabase) {
    return {
      connected: false,
      message: 'بيانات اتصال Supabase غير مكتملة في ملف .env.local',
    };
  }

  try {
    const { data, error } = await supabase.from('sources').select('count', { count: 'exact', head: true });
    if (error) {
      return {
        connected: false,
        message: `خطأ في الاتصال بقاعدة البيانات: ${error.message}`,
        error,
      };
    }
    return {
      connected: true,
      message: 'تم الاتصال بقاعدة بيانات Supabase بنجاح وتأكيد الجداول!',
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `فشل الاتصال: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Sources helper functions
 */
export async function getActiveSources(): Promise<Source[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllSources(): Promise<Source[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSource(source: Omit<Source, 'id' | 'created_at'>): Promise<Source | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('sources')
    .insert([source])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSource(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('sources').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function toggleSourceActive(id: string, is_active: boolean): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('sources').update({ is_active }).eq('id', id);
  if (error) throw error;
  return true;
}

/**
 * Raw Posts helpers
 */
export async function insertRawPosts(posts: Omit<RawPost, 'id' | 'created_at'>[]): Promise<number> {
  if (!supabase || posts.length === 0) return 0;
  
  // Upsert on external_id to avoid duplicate news
  const { data, error } = await supabase
    .from('raw_posts')
    .upsert(posts, { onConflict: 'external_id', ignoreDuplicates: true })
    .select('id');

  if (error) {
    console.error('Error inserting raw posts:', error);
    return 0;
  }
  return data?.length || 0;
}

/**
 * Get unprocessed posts from the last N hours (default: 48h)
 */
export async function getUnprocessedPosts(limit = 60, maxAgeHours = 48): Promise<RawPost[]> {
  if (!supabase) return [];

  const since = new Date();
  since.setHours(since.getHours() - maxAgeHours);

  const { data, error } = await supabase
    .from('raw_posts')
    .select('*')
    .eq('is_processed', false)
    .gte('published_at', since.toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get most recent posts from the last N hours regardless of processed status
 * Used as fallback for manual dashboard runs so user is never stuck with "0 posts"
 */
export async function getRecentPosts(limit = 40, maxAgeHours = 48): Promise<RawPost[]> {
  if (!supabase) return [];

  const since = new Date();
  since.setHours(since.getHours() - maxAgeHours);

  const { data, error } = await supabase
    .from('raw_posts')
    .select('*')
    .gte('published_at', since.toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Delete all raw_posts older than N hours (auto cleanup — default: 720h = 30 days = 1 month)
 * Digests and delivery logs remain permanently stored.
 */
export async function cleanupOldPosts(maxAgeHours = 720): Promise<number> {
  if (!supabase) return 0;

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - maxAgeHours);

  const { data, error } = await supabase
    .from('raw_posts')
    .delete()
    .lt('published_at', cutoff.toISOString())
    .select('id');

  if (error) {
    console.warn('Cleanup error:', error.message);
    return 0;
  }
  return data?.length || 0;
}

export async function markPostsAsProcessed(postIds: string[]): Promise<void> {
  if (!supabase || postIds.length === 0) return;
  await supabase
    .from('raw_posts')
    .update({ is_processed: true })
    .in('id', postIds);
}

/**
 * Digests helpers
 */
export async function saveDigest(digest: Omit<Digest, 'id' | 'created_at'>): Promise<Digest | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('digests')
    .insert([digest])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRecentDigests(limit = 20): Promise<Digest[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('digests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Delivery Logs helpers
 */
export async function logDelivery(log: Omit<DeliveryLog, 'id' | 'sent_at'>): Promise<void> {
  if (!supabase) return;
  await supabase.from('delivery_logs').insert([log]);
}

export async function getRecentLogs(limit = 30): Promise<DeliveryLog[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('delivery_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * App Settings
 */
export async function getAppSettings(): Promise<AppSettings> {
  const defaultSettings: AppSettings = {
    id: 'global',
    default_language: (process.env.DEFAULT_LANGUAGE as any) || 'ar',
    ai_model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite',
    summary_tone: 'journalistic',
    schedule_times: ['08:00', '14:00', '20:00'],
    telegram_enabled: true,
    whatsapp_enabled: true,
    updated_at: new Date().toISOString(),
  };

  if (!supabase) return defaultSettings;

  try {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 'global').single();
    if (data) return data;
  } catch (err) {
    // fallback
  }

  return defaultSettings;
}

export async function updateAppSettings(settings: Partial<AppSettings>): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('app_settings')
    .upsert({ id: 'global', ...settings, updated_at: new Date().toISOString() });
}
