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

  // Format raw posts — source handle is embedded INSIDE the content so the AI cannot miss it
  const newsContext = posts
    .map((p, index) => {
      const handle = p.author || 'مصدر مجهول';
      // Append source at end of content text itself — not just as metadata
      const contentWithSource = `${p.content.trim()} — ${handle}`;
      return `[${index + 1}] ${contentWithSource}`;
    })
    .join('\n\n');

  const systemPrompt = `
You are an elite multilingual news summarizer. Your STRICT job is to synthesize news from the Sahel region (Mali, Burkina Faso, Niger, Mauritania) in journalistic style.

ABSOLUTE RULES — NO EXCEPTIONS:
1. Every single bullet point MUST end with the exact source attribution in brackets: [المصدر: @handle]
2. The source handle is embedded at the end of each raw news item (after " — "). Use it EXACTLY as written.
3. NEVER write a bullet without its source citation. A bullet without a source is INVALID.
4. Group related news under thematic bold headings (** ... **).
5. Use bullet points: 🔹 for main points, • for sub-points.
6. No recommendations, no analysis, no conclusions paragraph.

EXAMPLE OF CORRECT OUTPUT FORMAT (summary_ar):
🔹 اشتباكات بين قوات JNIM والجيش في مقاطعة كايا بعد هجوم على ثكنة عسكرية. [المصدر: @SahelAlerte]
🔹 انحياز فصيل إمغاد إلى جبهة تحرير أزواد FLA. [المصدر: @Oumar_Alansari]

EXAMPLE OF CORRECT OUTPUT FORMAT (summary_fr):
🔹 Affrontements entre le JNIM et l'armée dans la province de Kaya après une attaque contre une caserne. [Source: @SahelAlerte]
🔹 Une faction Imghad rejoint le Front de Libération de l'Azawad FLA. [Source: @Oumar_Alansari]

Output ONLY valid JSON:
{
  "title": "Short compelling headline",
  "summary_ar": "Full Arabic summary — every 🔹 bullet MUST end with [المصدر: @handle]",
  "summary_fr": "Full French summary — every 🔹 bullet MUST end with [Source: @handle]",
  "summary_en": "Full English summary — every 🔹 bullet MUST end with [Source: @handle]"
}
`;

  const userPrompt = `
Time Period: ${timeSlot}
Total raw news items: ${posts.length}

RAW NEWS ITEMS (each item ends with " — @source_handle"):
---
${newsContext}
---

Generate the JSON digest now. Remember: EVERY bullet point must end with [المصدر: @handle]. No exceptions.
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
      max_tokens: 6000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
  }

  const jsonResult = await response.json();
  const rawText = jsonResult.choices?.[0]?.message?.content || '{}';

  // Robust field extractor — works even when JSON is truncated
  const extractField = (text: string, key: string): string => {
    // Try to find "key": "value" where value may span multiple lines
    const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^\\"]|\\\\.)*)`, 's');
    const m = text.match(regex);
    if (!m) return '';
    // Unescape common sequences
    return m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .trim();
  };

  let parsed: any = null;
  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

  try {
    // First try standard parse (works when response is complete)
    parsed = JSON.parse(cleaned);
  } catch {
    // JSON is truncated — extract each field individually via regex
    console.warn('[openrouter] JSON truncated, using regex field extraction');
    const title = extractField(cleaned, 'title');
    const summaryAr = extractField(cleaned, 'summary_ar');
    const summaryFr = extractField(cleaned, 'summary_fr');
    const summaryEn = extractField(cleaned, 'summary_en');

    if (!summaryAr && !summaryFr && !summaryEn) {
      // Nothing extractable — return raw as fallback
      console.error('[openrouter] Could not extract any field from response');
      return {
        title: title || 'نشرة إخبارية',
        summaryAr: cleaned,
        summaryFr: cleaned,
        summaryEn: cleaned,
        formattedOutput: cleaned,
      };
    }

    parsed = { title, summary_ar: summaryAr, summary_fr: summaryFr, summary_en: summaryEn };
  }

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
}
