-- ================================================================
-- AI News Pulse - Supabase Database Schema
-- Run this in your Supabase SQL Editor: Dashboard -> SQL Editor -> New Query
-- ================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SOURCES TABLE (مصادر الأخبار وحسابات X وخلاصات RSS)
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('x_account', 'x_search', 'rss', 'web')),
    url_or_handle TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    language TEXT DEFAULT 'all', -- 'ar', 'fr', 'en', 'all'
    is_active BOOLEAN DEFAULT true,
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RAW POSTS TABLE (المنشورات والتغريدات المحفوظة قبل المعالجة والتلخيص)
CREATE TABLE IF NOT EXISTS raw_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
    external_id TEXT UNIQUE, -- Unique constraint to avoid duplicates
    author TEXT,
    content TEXT NOT NULL,
    url TEXT,
    media_url TEXT,
    language TEXT,
    published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. DIGESTS TABLE (النشرات التلخيصية المولدة بواسطة الذكاء الاصطناعي)
CREATE TABLE IF NOT EXISTS digests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    time_slot TEXT DEFAULT 'manual', -- 'morning', 'afternoon', 'evening', 'manual'
    language TEXT DEFAULT 'ar',      -- 'ar', 'fr', 'en', 'dual_ar_fr'
    summary_ar TEXT,
    summary_fr TEXT,
    summary_en TEXT,
    raw_posts_count INTEGER DEFAULT 0,
    sources_count INTEGER DEFAULT 0,
    model_used TEXT DEFAULT 'google/gemini-2.5-flash-lite',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. DELIVERY LOGS TABLE (سجلات وصول النشرات لتيليجرام وواتساب)
CREATE TABLE IF NOT EXISTS delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    digest_id UUID REFERENCES digests(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp')),
    target_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. APP SETTINGS TABLE (إعدادات النظام العامة)
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    default_language TEXT DEFAULT 'ar',
    ai_model TEXT DEFAULT 'google/gemini-2.5-flash-lite',
    summary_tone TEXT DEFAULT 'journalistic',
    schedule_times JSONB DEFAULT '["08:00", "14:00", "20:00"]'::jsonb,
    telegram_enabled BOOLEAN DEFAULT true,
    whatsapp_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert Default Settings if not exists
INSERT INTO app_settings (id, default_language, ai_model, summary_tone, schedule_times, telegram_enabled, whatsapp_enabled)
VALUES (
    'global',
    'ar',
    'google/gemini-2.5-flash-lite',
    'journalistic',
    '["08:00", "14:00", "20:00"]'::jsonb,
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Initial Seed Sources (أمثلة افتراضية للمصادر باللغات العربية والفرنسية والإنجليزية)
INSERT INTO sources (name, type, url_or_handle, category, language, is_active)
VALUES
    ('Al Jazeera Breaking (عاجل الجزيرة)', 'x_account', '@AJABreaking', 'breaking', 'ar', true),
    ('BBC Arabic (بي بي سي عربي)', 'rss', 'https://feeds.bbci.co.uk/arabic/rss.xml', 'general', 'ar', true),
    ('France 24 Actualités', 'rss', 'https://www.france24.com/fr/rss', 'general', 'fr', true),
    ('TechCrunch AI', 'rss', 'https://techcrunch.com/category/artificial-intelligence/feed/', 'technology', 'en', true),
    ('Reuters Top News', 'rss', 'https://www.reutersagency.com/feed/?best-topics=top-news&post_type=best', 'world', 'en', true)
ON CONFLICT DO NOTHING;

-- Create Indexes for Fast Querying
CREATE INDEX IF NOT EXISTS idx_raw_posts_is_processed ON raw_posts(is_processed);
CREATE INDEX IF NOT EXISTS idx_raw_posts_published_at ON raw_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_digests_created_at ON digests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_digest_id ON delivery_logs(digest_id);

-- Enable Row Level Security (RLS)
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read/write via service role / anon for our server-side API
CREATE POLICY "Allow public read-write for sources" ON sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for raw_posts" ON raw_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for digests" ON digests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for delivery_logs" ON delivery_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
