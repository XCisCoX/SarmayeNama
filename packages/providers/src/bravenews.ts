import { z } from 'zod';
import { fetchJson, ProviderError } from './http.js';
import type { NewsProvider, NewsArticle, ProviderContext } from './types.js';

/**
 * Brave Search API — News Search. Free tier: 2000 queries/month, attribution
 * required. Used as a fallback when NewsAPI is not configured.
 * https://brave.com/search/api/
 */
const newsSearchSchema = z
  .object({
    web: z
      .object({
        results: z
          .array(
            z.object({
              title: z.string().optional(),
              url: z.string().optional(),
              description: z.string().optional(),
              age: z.string().optional(),
              page_age: z.string().optional(),
              time_published: z.string().optional(),
              source: z.object({ name: z.string().optional() }).optional(),
            })
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough();

export class BraveNewsProvider implements NewsProvider {
  id = 'brave';
  displayName = 'Brave Search API';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly ctx: ProviderContext) {
    this.apiKey = ctx.env.BRAVE_API_KEY ?? '';
    this.baseUrl = ctx.env.BRAVE_BASE_URL ?? 'https://api.search.brave.com/res/v1';
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
    if (!this.apiKey) throw new ProviderError('BRAVE_API_KEY is not configured', this.id, false);
    const q = new URLSearchParams({
      q: input.query,
      count: String(Math.min(input.count, 20)),
      freshness: input.freshness ?? 'past_72h',
      search_lang: input.searchLang ?? 'fa',
      country: input.country ?? 'ir',
    });
    const url = `${this.baseUrl}/news/search?${q.toString()}`;
    const raw = await fetchJson<unknown>(url, this.id, {
      retries: 1,
      timeoutMs: 15_000,
      headers: { 'X-Subscription-Token': this.apiKey },
    });
    const parsed = newsSearchSchema.parse(raw);
    const out: NewsArticle[] = [];
    for (const r of parsed.web?.results ?? []) {
      if (!r.title || !r.url) continue;
      out.push({
        title: r.title,
        url: r.url,
        description: r.description,
        source: r.source?.name ?? r.age ?? undefined,
        publishedAt: r.time_published,
        lang: input.searchLang ?? 'fa',
      });
    }
    return out;
  }
}
