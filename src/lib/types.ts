export type SourceType = 'x_account' | 'x_search' | 'rss' | 'web';
export type SupportedLanguage = 'ar' | 'fr' | 'en' | 'all' | 'dual_ar_fr';
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'manual';
export type DeliveryStatus = 'success' | 'failed' | 'pending';
export type DeliveryChannel = 'telegram' | 'whatsapp';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url_or_handle: string;
  category: string;
  language: SupportedLanguage;
  is_active: boolean;
  last_fetched_at?: string | null;
  created_at: string;
}

export interface RawPost {
  id: string;
  source_id?: string;
  external_id?: string;
  author?: string;
  content: string;
  url?: string;
  media_url?: string;
  language?: string;
  published_at: string;
  is_processed: boolean;
  created_at: string;
}

export interface Digest {
  id: string;
  title: string;
  time_slot: TimeSlot;
  language: SupportedLanguage;
  summary_ar?: string | null;
  summary_fr?: string | null;
  summary_en?: string | null;
  raw_posts_count: number;
  sources_count: number;
  model_used: string;
  created_at: string;
}

export interface DeliveryLog {
  id: string;
  digest_id: string;
  channel: DeliveryChannel;
  target_id?: string;
  status: DeliveryStatus;
  error_message?: string | null;
  sent_at: string;
}

export interface AppSettings {
  id: string;
  default_language: SupportedLanguage;
  ai_model: string;
  summary_tone: string;
  schedule_times: string[];
  telegram_enabled: boolean;
  whatsapp_enabled: boolean;
  updated_at: string;
}

export interface TestConnectionResult {
  service: 'supabase' | 'openrouter' | 'x_scraper' | 'telegram' | 'whatsapp';
  status: 'ok' | 'error' | 'warning' | 'skipped';
  message: string;
  details?: any;
}
