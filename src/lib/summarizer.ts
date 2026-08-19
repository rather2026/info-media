import { getActiveSources, insertRawPosts, getUnprocessedPosts, saveDigest, logDelivery, markPostsAsProcessed, getAppSettings, cleanupOldPosts } from './supabase';
import { fetchXTweets } from './fetchers/x-scraper';
import { fetchRssFeed } from './fetchers/rss-scraper';
import { generateNewsDigest } from './openrouter';
import { sendTelegramMessage } from './telegram';
import { sendWhatsAppMessage } from './whatsapp';
import { Source, RawPost, Digest, SupportedLanguage, TimeSlot } from './types';

export interface RunPipelineOptions {
  timeSlot?: TimeSlot;
  overrideLanguage?: SupportedLanguage;
  overrideModel?: string;
  skipDelivery?: boolean;
  /** Filtre les actualités plus anciennes que N heures (défaut: 48h) */
  newsAgeHours?: number;
}

export interface PipelineResult {
  success: boolean;
  message: string;
  fetchedPostsCount: number;
  digest?: Digest | null;
  telegramSent: boolean;
  whatsappSent: boolean;
  errors: string[];
}

/**
 * Execute full AI News Pulse Digest Pipeline
 */
export async function runNewsDigestPipeline(options: RunPipelineOptions = {}): Promise<PipelineResult> {
  const errors: string[] = [];
  const timeSlot = options.timeSlot || 'manual';
  const settings = await getAppSettings();
  const targetLanguage = options.overrideLanguage || settings.default_language || 'ar';
  const targetModel = options.overrideModel || settings.ai_model || 'google/gemini-2.5-flash-lite';

  console.log(`[Pipeline] Starting run - TimeSlot: ${timeSlot}, Lang: ${targetLanguage}, Model: ${targetModel}`);

  // Step 1: Fetch active sources
  let sources: Source[] = [];
  try {
    sources = await getActiveSources();
  } catch (err: any) {
    errors.push(`Failed to fetch sources: ${err.message}`);
  }

  // Step 2: Ingest from all sources
  let allNewPosts: Omit<RawPost, 'id' | 'created_at'>[] = [];
  for (const source of sources) {
    try {
      if (source.type === 'x_account' || source.type === 'x_search') {
        const xPosts = await fetchXTweets(source);
        allNewPosts.push(...xPosts);
      } else if (source.type === 'rss' || source.type === 'web') {
        const rssPosts = await fetchRssFeed(source);
        allNewPosts.push(...rssPosts);
      }
    } catch (err: any) {
      errors.push(`Error fetching from ${source.name}: ${err.message}`);
    }
  }

  // Step 3: Insert raw posts to Supabase (deduped automatically by external_id)
  let insertedCount = 0;
  if (allNewPosts.length > 0) {
    try {
      insertedCount = await insertRawPosts(allNewPosts);
    } catch (err: any) {
      errors.push(`Error saving raw posts: ${err.message}`);
    }
  }

  const newsAgeHours = options.newsAgeHours || 48;
  const cutoffTime = new Date(Date.now() - newsAgeHours * 60 * 60 * 1000).toISOString();

  // Step 4: Retrieve unprocessed posts for AI summarization (within last 48h)
  let unprocessedPosts: RawPost[] = [];
  try {
    unprocessedPosts = await getUnprocessedPosts(50, newsAgeHours);
  } catch (err: any) {
    errors.push(`Error loading unprocessed posts: ${err.message}`);
  }

  // Filter raw posts to guarantee they are within the 48-hour window
  const freshNewPosts = allNewPosts.filter((p) => !p.published_at || p.published_at >= cutoffTime);

  // If no posts in DB, use whatever fresh posts we just fetched
  const postsToSummarize: Array<{ author?: string; content: string; url?: string; published_at?: string }> = 
    unprocessedPosts.length > 0 
      ? unprocessedPosts 
      : freshNewPosts;

  if (postsToSummarize.length === 0) {
    return {
      success: true,
      message: 'لم يتم العثور على أي أخبار جديدة خلال آخر 48 ساعة لمعالجتها.',
      fetchedPostsCount: 0,
      telegramSent: false,
      whatsappSent: false,
      errors,
    };
  }

  // Step 5: AI Summarization via OpenRouter
  let aiDigestOutput;
  try {
    aiDigestOutput = await generateNewsDigest({
      posts: postsToSummarize.map((p) => ({
        author: p.author,
        content: p.content,
        url: p.url,
        publishedAt: p.published_at,
      })),
      language: targetLanguage,
      model: targetModel,
      timeSlot: timeSlot,
    });
  } catch (err: any) {
    errors.push(`AI Summarization failed: ${err.message}`);
    throw new Error(`AI Summarization failed: ${err.message}`);
  }

  // Step 6: Save Digest to Database
  let savedDigest: Digest | null = null;
  try {
    savedDigest = await saveDigest({
      title: aiDigestOutput.title,
      time_slot: timeSlot,
      language: targetLanguage,
      summary_ar: aiDigestOutput.summaryAr,
      summary_fr: aiDigestOutput.summaryFr,
      summary_en: aiDigestOutput.summaryEn,
      raw_posts_count: postsToSummarize.length,
      sources_count: sources.length,
      model_used: targetModel,
    });
  } catch (err: any) {
    errors.push(`Failed to save digest: ${err.message}`);
  }

  // Step 7: Dispatch to Telegram & WhatsApp
  let telegramSent = false;
  let whatsappSent = false;
  const digestId = savedDigest?.id || 'temp-id';
  const textToSend = aiDigestOutput.formattedOutput;

  if (!options.skipDelivery) {
    // 7a. Telegram Dispatch
    if (settings.telegram_enabled) {
      try {
        const tgRes = await sendTelegramMessage(textToSend);
        telegramSent = tgRes.success;
        await logDelivery({
          digest_id: digestId,
          channel: 'telegram',
          status: tgRes.success ? 'success' : 'failed',
          error_message: tgRes.error || null,
        });
      } catch (tgErr: any) {
        errors.push(`Telegram dispatch failed: ${tgErr.message}`);
      }
    }

    // 7b. WhatsApp Dispatch
    if (settings.whatsapp_enabled) {
      try {
        const waRes = await sendWhatsAppMessage(textToSend);
        whatsappSent = waRes.success;
        await logDelivery({
          digest_id: digestId,
          channel: 'whatsapp',
          status: waRes.success ? 'success' : 'failed',
          error_message: waRes.error || null,
        });
      } catch (waErr: any) {
        errors.push(`WhatsApp dispatch failed: ${waErr.message}`);
      }
    }
  }

  // Step 8: Mark processed posts & Auto cleanup old raw reference posts (> 30 days / 720h)
  if (unprocessedPosts.length > 0) {
    try {
      await markPostsAsProcessed(unprocessedPosts.map((p) => p.id));
    } catch (err: any) {
      errors.push(`Failed to mark posts as processed: ${err.message}`);
    }
  }

  // Auto cleanup database raw posts older than 30 days (720 hours) to prevent database bloat
  try {
    await cleanupOldPosts(720); // 30 days retention for reference news
  } catch (err: any) {
    console.warn('Auto cleanup warning:', err.message);
  }

  return {
    success: true,
    message: `تم توليد النشرة الاستخباراتية الاستراتيجية بنجاح (${postsToSummarize.length} مادة مرصودة)`,
    fetchedPostsCount: postsToSummarize.length,
    digest: savedDigest,
    telegramSent,
    whatsappSent,
    errors,
  };
}
