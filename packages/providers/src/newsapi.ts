import { z } from 'zod';
import { fetchJson, ProviderError } from './http.js';
import type { NewsProvider, NewsArticle, ProviderContext } from './types.js';

/**
 * NewsAPI.org — free tier: 100 requests/day, non-commercial use only,
 * articles typically from the last 24h+. Attribution required.
 * https://newsapi.org/docs/endpoints/everything
 */
const everythingSchema = z
  .object({
    status: z.string(),
    totalResults: z.number().optional(),
    articles: z
      .array(
        z.object({
          source: z.object({ name: z.string().optional() }).optional(),
          author: z.string().nullable().optional(),
          title: z.string().optional(),
          description: z.string().nullable().optional(),
          url: z.string().optional(),
          publishedAt: z.string().nullable().optional(),
        })
      )
      .optional(),
  })
  .passthrough();

export class NewsApiNewsProvider implements NewsProvider {
  id = 'newsapi';
  displayName = 'NewsAPI.org';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly ctx: ProviderContext) {
    this.apiKey = ctx.env.NEWS_API_KEY ?? '';
    this.baseUrl = ctx.env.NEWSAPI_BASE_URL ?? 'https://newsapi.org/v2';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async getNews(input: {
    query: string;
    count: number;
    freshness?: string;
    searchLang?: string;
    country?: string;
  }): Promise<NewsArticle[]> {
    if (!this.apiKey) throw new ProviderError('NEWS_API_KEY is not configured', this.id, false);
    const q = new URLSearchParams({
      q: input.query,
      sortBy: 'publishedAt',
      pageSize: String(Math.min(input.count, 20)),
    });
    // NewsAPI supports a fixed language set that does NOT include Persian;
    // for fa we search all languages (the query text itself is Persian).
    const supported = ['ar', 'de', 'en', 'es', 'fr', 'he', 'it', 'nl', 'no', 'pt', 'ru', 'sv', 'ud', 'zh'];
    const sl = input.searchLang ?? 'fa';
    if (sl !== 'fa' && supported.includes(sl)) q.set('language', sl);
    const url = `${this.baseUrl}/everything?${q.toString()}`;
    const raw = await fetchJson<unknown>(url, this.id, {
      retries: 1,
      timeoutMs: 15_000,
      headers: { 'X-Api-Key': this.apiKey },
    });
    const parsed = everythingSchema.parse(raw);
    if (parsed.status === 'error') {
      throw new ProviderError(`NewsAPI error for query "${input.query}"`, this.id, false);
    }
    const out: NewsArticle[] = [];
    for (const a of parsed.articles ?? []) {
      if (!a.title || !a.url) continue;
      out.push({
        title: a.title,
        url: a.url,
        description: a.description ?? undefined,
        source: a.source?.name ?? undefined,
        publishedAt: a.publishedAt ?? undefined,
        lang: input.searchLang ?? 'fa',
      });
    }
    return out;
  }
}
