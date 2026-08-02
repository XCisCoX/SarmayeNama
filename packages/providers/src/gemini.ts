import { z } from 'zod';
import { fetchJson, ProviderError } from './http.js';
import type { ProviderContext } from './types.js';

/**
 * Google Gemini — AI market summary (free tier, e.g. gemini-2.0-flash).
 * Output is always labeled as AI-generated and never as financial advice.
 * https://ai.google.dev/api/generate-content
 */
const generateContentSchema = z
  .object({
    candidates: z
      .array(
        z.object({
          content: z.object({
            parts: z.array(z.object({ text: z.string().optional() })).optional(),
          }),
        })
      )
      .optional(),
    error: z
      .object({
        message: z.string().optional(),
        status: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export interface AiSummaryResult {
  text: string;
  model: string;
  generatedAt: string;
}

export class GeminiSummarizer {
  id = 'gemini';
  displayName = 'Google Gemini';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  readonly model: string;

  constructor(private readonly ctx: ProviderContext) {
    this.apiKey = ctx.env.GEMINI_API_KEY ?? '';
    this.baseUrl = ctx.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com';
    this.model = ctx.env.GEMINI_MODEL;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Summarize the given quotes. The prompt is fully static (no user input),
   * so there is no prompt-injection surface. The caller must display the
   * "AI-generated, not financial advice" disclaimer.
   */
  async summarize(marketText: string, lang: 'fa' | 'en'): Promise<AiSummaryResult> {
    if (!this.apiKey) throw new ProviderError('GEMINI_API_KEY is not configured', this.id, false);
    const instruction =
      lang === 'fa'
        ? 'تو یک تحلیلگر مالی هستی. خلاصه‌ای کوتاه و بی‌طرفانه از داده‌های بازار زیر بنویس (حداکثر ۱۲۰ کلمه، فارسی، بدون توصیه سرمایه‌گذاری). به تغییرات مهم اشاره کن و بگو این یک تحلیل خودکار است.'
        : 'You are a financial analyst. Write a short neutral summary of the market data below (max 120 words, no investment advice). Highlight important moves and note this is an automated analysis.';
    const payload = {
      contents: [{ parts: [{ text: `${instruction}\n\n${marketText}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
    };
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const raw = await fetchJson<unknown>(url, this.id, {
      retries: 1,
      timeoutMs: 25_000,
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
    const parsed = generateContentSchema.parse(raw);
    if (parsed.error?.message) {
      throw new ProviderError(`Gemini error: ${parsed.error.message}`, this.id, false);
    }
    const text = parsed.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim();
    if (!text) throw new ProviderError('Gemini returned an empty summary', this.id, false);
    return { text, model: this.model, generatedAt: new Date().toISOString() };
  }
}
