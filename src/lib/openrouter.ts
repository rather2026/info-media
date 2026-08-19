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
          { role: 'system', content: 'You are an AI news summarization bot. Reply briefly in Arabic.' },
          { role: 'user', content: 'اختبار الاتصال السريع: هل النموذج جاهز لتلخيص الأخبار؟' }
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { connected: false, message: `فشل الاتصال بـ OpenRouter (${response.status}): ${errorText}` };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'تم الرد بنجاح.';
    return { connected: true, modelUsed: model, message: 'تم الاتصال بنموذج OpenRouter بنجاح!', sampleReply: reply };
  } catch (err: any) {
    return { connected: false, message: `خطأ في استدعاء OpenRouter: ${err.message || 'Unknown network error'}` };
  }
}

interface SummarizeOptions {
  posts: Array<{ author?: string; content: string; url?: string; sourceName?: string; publishedAt?: string }>;
  language: SupportedLanguage;
  model?: string;
  timeSlot?: string;
}

/**
 * Call the AI for a SINGLE language — returns plain text directly (no JSON wrapping).
 * This eliminates all JSON truncation/parsing issues.
 */
async function generateSingleLanguageSummary(
  newsContext: string,
  lang: 'ar' | 'fr' | 'en',
  apiKey: string,
  selectedModel: string,
  timeSlot: string
): Promise<string> {

  const langInstructions: Record<string, string> = {
    ar: `أنت ملخص إخباري متخصص في أخبار منطقة الساحل الإفريقي (مالي، بوركينا فاسو، النيجر، موريتانيا).

اكتب ملخصاً إخبارياً نقياً ومباشراً بالعربية الفصحى الصحفية.

القواعد الإلزامية:
1. كل نقطة تبدأ بـ 🔹 وتنتهي بـ [المصدر: @handle] — كل نقطة، بدون استثناء.
2. استخدم عناوين ثريمة بين **النجمتين** لتجميع الأخبار حسب الموضوع أو البلد.
3. المصدر موجود في نهاية كل خبر بعد " — " — استخدمه كما هو تماماً.
4. بلا توصيات، بلا تحليلات في النهاية.

مثال الشكل الصحيح:
**أخبار مالي**
🔹 اشتباكات بين قوات JNIM والجيش في مقاطعة كايا. [المصدر: @SahelAlerte]
🔹 انحياز فصيل إمغاد إلى جبهة تحرير أزواد FLA. [المصدر: @Oumar_Alansari]

أرجع النص المنسق مباشرة، بدون أي مقدمات أو ملاحظات.`,

    fr: `Tu es un résumé de presse spécialisé sur l'actualité du Sahel (Mali, Burkina Faso, Niger, Mauritanie).

Rédige un résumé journalistique direct en français.

Règles absolues :
1. Chaque point commence par 🔹 et se termine par [Source: @handle] — chaque point, sans exception.
2. Groupe les nouvelles sous des titres thématiques en **gras**.
3. La source est à la fin de chaque item après " — " — utilise-la telle quelle.
4. Pas de recommandations, pas de conclusions.

Exemple du format correct :
**Actualités Mali**
🔹 Affrontements entre le JNIM et l'armée dans la province de Kaya. [Source: @SahelAlerte]
🔹 Une faction Imghad rejoint le FLA. [Source: @Oumar_Alansari]

Retourne uniquement le texte formaté, sans introduction ni commentaire.`,

    en: `You are a Sahel news digest specialist (Mali, Burkina Faso, Niger, Mauritania).

Write a direct journalistic summary in English.

Absolute rules:
1. Every bullet starts with 🔹 and ends with [Source: @handle] — every single bullet, no exceptions.
2. Group news under **bold** thematic headings.
3. Source is at end of each item after " — " — use it exactly as written.
4. No recommendations, no conclusions.

Example of correct format:
**Mali Updates**
🔹 Clashes between JNIM forces and the army in Kaya province. [Source: @SahelAlerte]
🔹 An Imghad faction joins the FLA. [Source: @Oumar_Alansari]

Return only the formatted text, no preamble or commentary.`,
  };

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Sahel News Digest',
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: 'system', content: langInstructions[lang] },
        {
          role: 'user',
          content: `Time: ${timeSlot}\n\nNEWS ITEMS (source after " — "):\n---\n${newsContext}\n---\n\nWrite the formatted digest now. Every 🔹 bullet MUST end with [${lang === 'ar' ? 'المصدر' : 'Source'}: @handle].`
        }
      ],
      temperature: 0.2,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
  }

  const jsonResult = await response.json();
  const text = jsonResult.choices?.[0]?.message?.content || '';

  // Check if the model accidentally returned JSON instead of plain text
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    const keyMap: Record<string, string> = { ar: 'summary_ar', fr: 'summary_fr', en: 'summary_en' };
    try {
      const parsed = JSON.parse(trimmed);
      return parsed[keyMap[lang]] || parsed.summary_ar || text;
    } catch {
      // Extract the field with regex
      const key = keyMap[lang];
      const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`,'s');
      const m = trimmed.match(regex);
      if (m) return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    }
  }

  return text.trim();
}

/**
 * Extract a short headline from the Arabic summary
 */
function extractTitle(summaryAr: string): string {
  // Try to get first heading or first bullet's topic
  const headingMatch = summaryAr.match(/\*\*([^*]+)\*\*/);
  if (headingMatch) return headingMatch[1].trim();
  const bulletMatch = summaryAr.match(/🔹\s*([^[.\n]{10,60})/);
  if (bulletMatch) return bulletMatch[1].trim();
  return 'نشرة الأخبار الموجزة';
}

/**
 * Main AI Summarizer using OpenRouter — generates ONE language at a time (3× smaller, no JSON truncation)
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

  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured.');

  if (posts.length === 0) {
    return {
      title: 'لا توجد أخبار جديدة للتلخيص',
      summaryAr: 'لم يتم العثور على منشورات أو أخبار جديدة خلال هذه الفترة.',
      summaryFr: 'Aucune nouvelle publication à résumer pour cette période.',
      summaryEn: 'No new posts found to summarize for this period.',
      formattedOutput: 'لم يتم العثور على أخبار جديدة.',
    };
  }

  // Format raw posts — source handle embedded directly IN the content text
  const newsContext = posts
    .map((p, index) => {
      const handle = p.author || 'مصدر مجهول';
      return `[${index + 1}] ${p.content.trim()} — ${handle}`;
    })
    .join('\n\n');

  // Determine which languages to generate
  const langsToGenerate: Array<'ar' | 'fr' | 'en'> =
    language === 'dual_ar_fr' ? ['ar', 'fr'] :
    language === 'ar' ? ['ar'] :
    language === 'fr' ? ['fr'] :
    language === 'en' ? ['en'] :
    ['ar'];

  const results: Record<string, string> = {};

  // Generate each language separately (smaller prompts = no truncation)
  for (const lang of langsToGenerate) {
    try {
      results[lang] = await generateSingleLanguageSummary(
        newsContext, lang, apiKey, selectedModel, timeSlot
      );
    } catch (err: any) {
      console.error(`[openrouter] Failed to generate ${lang} summary:`, err.message);
      results[lang] = '';
    }
  }

  // Always have Arabic (generate if missing)
  if (!results.ar) {
    try {
      results.ar = await generateSingleLanguageSummary(newsContext, 'ar', apiKey, selectedModel, timeSlot);
    } catch {
      results.ar = 'تعذّر توليد الملخص العربي.';
    }
  }

  const summaryAr = results.ar || '';
  const summaryFr = results.fr || '';
  const summaryEn = results.en || '';

  const title = extractTitle(summaryAr);

  let formattedOutput = '';
  if (language === 'ar') {
    formattedOutput = summaryAr;
  } else if (language === 'fr') {
    formattedOutput = summaryFr || summaryAr;
  } else if (language === 'en') {
    formattedOutput = summaryEn || summaryAr;
  } else if (language === 'dual_ar_fr') {
    formattedOutput = `${summaryAr}\n\n═══════════════════════\n🇫🇷 RÉSUMÉ EN FRANÇAIS\n═══════════════════════\n\n${summaryFr}`;
  } else {
    formattedOutput = summaryAr;
  }

  return { title, summaryAr, summaryFr, summaryEn, formattedOutput };
}
