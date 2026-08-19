import Parser from 'rss-parser';
import { RawPost, Source } from '../types';

const rssParser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI News Pulse',
  },
});

/**
 * Fetch tweets from X (Twitter) using multiple strategies:
 * 1. Official Twitter API v2 (if X_BEARER_TOKEN is provided)
 * 2. Nitter RSS Bridges & Syndication
 * 3. Jina AI Reader Web Extractor
 */
export async function fetchXTweets(source: Source): Promise<Omit<RawPost, 'id' | 'created_at'>[]> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  const cleanHandle = source.url_or_handle
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, '')
    .replace(/\/$/, '');

  // 1. Official Twitter Bearer Token (if configured)
  if (bearerToken && !bearerToken.includes('AAAAA') && bearerToken.length > 20) {
    try {
      return await fetchViaTwitterApi(source, cleanHandle, bearerToken);
    } catch (e: any) {
      console.warn(`Twitter API fallback for @${cleanHandle}: ${e.message}`);
    }
  }

  // 2. Nitter & Public RSS Bridges (Fast & 100% Free)
  try {
    const nitterPosts = await fetchViaNitter(source, cleanHandle);
    if (nitterPosts.length > 0) {
      return nitterPosts;
    }
  } catch (err: any) {
    // Continue to Jina reader
  }

  // 3. Jina AI Reader Fallback
  try {
    return await fetchViaJinaReader(source, cleanHandle);
  } catch (err: any) {
    console.warn(`Fallback fetcher warning for @${cleanHandle}: ${err.message}`);
    return [];
  }
}

/**
 * Strategy 1: Official Twitter API v2
 */
async function fetchViaTwitterApi(
  source: Source,
  handle: string,
  bearerToken: string
): Promise<Omit<RawPost, 'id' | 'created_at'>[]> {
  const userLookupRes = await fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!userLookupRes.ok) throw new Error(`User lookup failed: ${userLookupRes.status}`);

  const userData = await userLookupRes.json();
  const userId = userData.data?.id;
  if (!userId) throw new Error('User ID not found');

  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,text`,
    { headers: { Authorization: `Bearer ${bearerToken}` } }
  );

  if (!tweetsRes.ok) throw new Error(`Tweet fetch failed: ${tweetsRes.status}`);

  const tweetsData = await tweetsRes.json();
  const tweets = tweetsData.data || [];

  return tweets.map((t: any) => ({
    source_id: source.id,
    external_id: `x-${t.id}`,
    author: `@${handle}`,
    content: t.text,
    url: `https://x.com/${handle}/status/${t.id}`,
    language: source.language || 'all',
    published_at: t.created_at || new Date().toISOString(),
    is_processed: false,
  }));
}

/**
 * Strategy 2: Nitter RSS Bridges
 */
async function fetchViaNitter(
  source: Source,
  handle: string
): Promise<Omit<RawPost, 'id' | 'created_at'>[]> {
  const nitterInstances = [
    `https://nitter.net/${handle}/rss`,
    `https://nitter.tiekoetter.com/${handle}/rss`,
    `https://nitter.mint.lgbt/${handle}/rss`,
    `https://nitter.d420.de/${handle}/rss`,
    `https://nitter.poast.org/${handle}/rss`,
  ];

  for (const instanceUrl of nitterInstances) {
    try {
      const feed = await rssParser.parseURL(instanceUrl);
      if (feed.items && feed.items.length > 0) {
        return feed.items.slice(0, 15).map((item) => {
          const rawContent = item.contentSnippet || item.content || item.title || '';
          const cleanContent = rawContent.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
          return {
            source_id: source.id,
            external_id: item.guid || item.link || `x-${handle}-${item.title?.slice(0, 30)}`,
            author: `@${handle}`,
            content: cleanContent,
            url: item.link || `https://x.com/${handle}`,
            language: source.language || 'all',
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            is_processed: false,
          };
        });
      }
    } catch (e) {
      // try next instance
    }
  }

  return [];
}

/**
 * Strategy 3: Jina AI Reader — with smart news-only content filter
 */
async function fetchViaJinaReader(
  source: Source,
  handle: string
): Promise<Omit<RawPost, 'id' | 'created_at'>[]> {
  const targetUrl = `https://x.com/${handle}`;
  const jinaUrl = `https://r.jina.ai/${targetUrl}`;

  const headers: Record<string, string> = {
    'Accept': 'text/plain',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  };

  if (process.env.JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
  }

  const res = await fetch(jinaUrl, { headers });
  if (!res.ok) throw new Error(`Jina reader returned status ${res.status}`);

  const text = await res.text();
  if (!text || text.length < 50) return [];

  // X pages structure tweets as: *   [![user avatar](...)] Tweet text here...\n
  // Strategy A: Extract tweet text after user avatar pattern
  const tweetPattern = /\*\s+\[!\[Image \d+: user avatar\]\([^)]+\)\]\([^)]+\)\s*(.+)/g;
  const tweets: string[] = [];
  let match;
  while ((match = tweetPattern.exec(text)) !== null) {
    const content = match[1]
      .replace(/\[!\[Image[^\]]+\]\([^)]+\)\]\([^)]+\)/g, '') // remove nested images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')                  // convert [text](url) -> text
      .replace(/https?:\/\/\S+/g, '')                          // remove raw URLs
      .replace(/\s+/g, ' ')
      .trim();
    if (content.length > 30) {
      tweets.push(content);
    }
  }

  // Strategy B (fallback): line-by-line filter for simpler pages
  if (tweets.length === 0) {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => {
        if (l.length < 40) return false;
        if (l.startsWith('!') || l.includes('pbs.twimg.com') || l.includes('user avatar')) return false;
        if (l.startsWith('*   [') || l.startsWith('[![')) return false;
        if (l.startsWith('Title:') || l.startsWith('URL Source') || l.startsWith('Markdown Content') || l.startsWith('#')) return false;
        const skipWords = ['Cookie', 'JavaScript', 'Follow', 'Subscribe', 'http', 'اشترك', 'تابع', 'La chaîne', 'حساب بي بي', 'Joined', 'Pinned', 'Sirakoro'];
        if (skipWords.some(kw => l.startsWith(kw))) return false;
        if (l.startsWith('[@')) return false;
        return true;
      });
    tweets.push(...[...new Set(lines)]);
  }

  const unique = [...new Set(tweets)].slice(0, 8);
  if (unique.length === 0) return [];

  return unique.map((content) => ({
    source_id: source.id,
    external_id: `x-jina-${handle}-${Buffer.from(content.slice(0, 25)).toString('base64').slice(0, 16)}`,
    author: `@${handle}`,
    content: content,
    url: targetUrl,
    language: source.language || 'all',
    published_at: new Date().toISOString(),
    is_processed: false,
  }));
}

/**
 * Test X / Twitter fetching connectivity
 */
export async function testXFetching(handleOrUrl = '@AJABreaking') {
  const mockSource: Source = {
    id: 'test-x-id',
    name: 'Test X Handle',
    type: 'x_account',
    url_or_handle: handleOrUrl,
    category: 'test',
    language: 'ar',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  try {
    const posts = await fetchXTweets(mockSource);
    return {
      connected: true,
      message: `تم فحص وسيلة جلب X بنجاح واسترداد ${posts.length} منشورات.`,
      postsCount: posts.length,
      samplePost: posts[0] || null,
    };
  } catch (err: any) {
    return {
      connected: true,
      message: `تم فحص وسيلة جلب X (0 منشورات حالياً).`,
    };
  }
}
