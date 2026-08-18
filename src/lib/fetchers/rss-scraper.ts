import Parser from 'rss-parser';
import { RawPost, Source } from '../types';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI News Pulse Bot',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
});

/**
 * Fetch and parse an RSS feed source
 */
export async function fetchRssFeed(source: Source): Promise<Omit<RawPost, 'id' | 'created_at'>[]> {
  try {
    const feed = await parser.parseURL(source.url_or_handle);
    const items = feed.items || [];

    const now = new Date().getTime();
    const maxAgeMs = 48 * 60 * 60 * 1000; // 48 hours

    return items
      .filter((item) => {
        if (!item.pubDate) return true;
        const pubTime = new Date(item.pubDate).getTime();
        return now - pubTime <= maxAgeMs;
      })
      .slice(0, 15)
      .map((item) => {
        // Remove HTML tags for clean AI prompt reading
        const rawContent = item.contentSnippet || item.content || item.summary || item.title || '';
        const cleanContent = rawContent
          .replace(/<[^>]*>?/gm, '')
          .replace(/\s+/g, ' ')
          .trim();

        const externalId = item.guid || item.link || `${source.id}-${item.title}`;

        return {
          source_id: source.id,
          external_id: externalId,
          author: item.creator || item.author || feed.title || source.name,
          content: `[${item.title}] ${cleanContent}`,
          url: item.link || '',
          language: source.language || 'all',
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          is_processed: false,
        };
      });
  } catch (error: any) {
    console.error(`Error fetching RSS feed from ${source.name} (${source.url_or_handle}):`, error.message);
    return [];
  }
}
