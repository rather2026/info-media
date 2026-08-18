import { SupportedLanguage } from './types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function getOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite';
}

export const isOpenRouterConfigured = Boolean(
  getOpenRouterApiKey() && 
  getOpenRouterApiKey().startsWith('sk-or-') &&
  !getOpenRouterApiKey().includes('xxxx')
);

/**
 * Test OpenRouter connectivity and model responsiveness
 */
export async function testOpenRouterConnection(modelName?: string) {
  const apiKey = getOpenRouterApiKey();
  const model = modelName || getOpenRouterModel();

  if (!apiKey || apiKey.includes('xxxx')) {
    return {
      connected: false,
      message: 'مفتاح OPENROUTER_API_KEY غير معين أو غير صالح في .env.local',
    };
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_SITE_NAME || 'AI News Pulse',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an AI news summarization bot. Reply briefly in Arabic with a confirmation message.'
          },
          {
            role: 'user',
            content: 'اختبار الاتصال السريع: هل النموذج جاهز لتلخيص الأخبار؟'
          }
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        connected: false,
        message: `فشل الاتصال بـ OpenRouter (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'تم الرد بنجاح بدون محتوى.';

    return {
      connected: true,
      modelUsed: model,
      message: 'تم الاتصال بنموذج OpenRouter بنجاح!',
      sampleReply: reply,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `خطأ في استدعاء OpenRouter: ${err.message || 'Unknown network error'}`,
    };
  }
}

interface SummarizeOptions {
  posts: Array<{ author?: string; content: string; url?: string; sourceName?: string; publishedAt?: string }>;
  language: SupportedLanguage;
  model?: string;
  timeSlot?: string;
}

/**
 * Main AI Summarizer using OpenRouter
 */
export async function generateNewsDigest({
  posts,
  language = 'ar',
  model,
  timeSlot = 'manual',
}: SummarizeOptions): Promise<{
  title: string;
  summaryAr: string;
  summaryFr: string;
  summaryEn: string;
  formattedOutput: string;
}> {
  const apiKey = getOpenRouterApiKey();
  const selectedModel = model || getOpenRouterModel();

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }

  if (posts.length === 0) {
    return {
      title: 'لا توجد أخبار جديدة للتلخيص',
      summaryAr: 'لم يتم العثور على منشورات أو أخبار جديدة خلال هذه الفترة.',
      summaryFr: 'Aucune nouvelle publication à résumer pour cette période.',
      summaryEn: 'No new posts found to summarize for this period.',
      formattedOutput: 'لم يتم العثور على أخبار جديدة.',
    };
  }

  // Format raw posts into a clean prompt context
  const newsContext = posts
    .map((p, index) => {
      const author = p.author ? `[المصدر/الكاتب: ${p.author}]` : '';
      return `${index + 1}. ${author} ${p.content} (رابط: ${p.url || 'لا يوجد'})`;
    })
    .join('\n\n');

  const systemPrompt = `
You are an elite, highly intelligent real-time multilingual news anchor and AI investigative summarizer.
Your goal is to digest, aggregate, deduplicate, and synthesize raw tweets and articles from Arabic, French, and English sources.

Structure rules:
1. Synthesize and group related news rather than listing raw posts.
2. Filter out spam, duplicates, trivial promotional posts, and retain only impactful, verified news facts.
3. For Arabic summary (العربية): Use eloquent modern journalistic Arabic, clear bold headlines, bullet points (• or 🔹), relevant emojis, and reference source names when available.
4. For French summary (Français): Use professional, crisp French with bullet points and clear key takeaways.
5. Provide high readability formatted specifically for Telegram & WhatsApp messaging.

Output strictly valid JSON with this exact schema:
{
  "title": "A captivating, short headline summarizing the main theme of this digest",
  "summary_ar": "The complete formatted Arabic digest ready to send to Telegram/WhatsApp. Include date/period, categorized bullet points with emojis, and a concluding brief note.",
  "summary_fr": "The complete formatted French digest ready for Telegram/WhatsApp.",
  "summary_en": "The complete formatted English digest."
}
`;

  const userPrompt = `
Time Period: ${timeSlot}
Total News Items to Analyze: ${posts.length}
Preferred Delivery Language: ${language}

Here is the raw news content collected:
---
${newsContext}
---

Generate the JSON digest now according to the system instructions.
`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': 'AI News Pulse Multi-Channel Dispatcher',
    },
    body: JSON.stringify({
      model: selectedModel,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
  }

  const jsonResult = await response.json();
  const rawText = jsonResult.choices?.[0]?.message?.content || '{}';

  try {
    const cleaned = rawText.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);

    let formattedOutput = '';
    if (language === 'ar') {
      formattedOutput = parsed.summary_ar || parsed.summary_en || '';
    } else if (language === 'fr') {
      formattedOutput = parsed.summary_fr || parsed.summary_en || '';
    } else if (language === 'dual_ar_fr') {
      formattedOutput = `${parsed.summary_ar}\n\n═══════════════════════\n🇫🇷 RÉSUMÉ EN FRANÇAIS\n═══════════════════════\n\n${parsed.summary_fr}`;
    } else {
      formattedOutput = parsed.summary_en || parsed.summary_ar || '';
    }

    return {
      title: parsed.title || 'نشرة الأخبار الموجزة',
      summaryAr: parsed.summary_ar || '',
      summaryFr: parsed.summary_fr || '',
      summaryEn: parsed.summary_en || '',
      formattedOutput: formattedOutput,
    };
  } catch (err) {
    console.error('Failed to parse AI JSON response:', rawText, err);
    return {
      title: 'نشرة إخبارية ذكية',
      summaryAr: rawText,
      summaryFr: rawText,
      summaryEn: rawText,
      formattedOutput: rawText,
    };
  }
}
