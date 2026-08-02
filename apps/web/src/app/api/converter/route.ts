import { okResponse, withRateLimit, errorResponse } from '@/lib/api-helpers';
import { runConversion } from '@/lib/server-data';
import { ConverterQuerySchema } from '@sarmaye/shared';

export const dynamic = 'force-dynamic';

export const GET = withRateLimit(async (req, { requestId }) => {
  const url = new URL(req.url);
  const parsed = ConverterQuerySchema.safeParse({
    from: url.searchParams.get('from') ?? '',
    to: url.searchParams.get('to') ?? '',
    amount: url.searchParams.get('amount') ?? undefined,
  });
  if (!parsed.success) return errorResponse('invalid_input', 'Invalid query parameters', 400, requestId);
  const lang = (url.searchParams.get('lang') ?? 'fa') === 'en' ? 'en' : 'fa';
  try {
    const result = await runConversion(parsed.data.from, parsed.data.to, parsed.data.amount ?? '1', lang);
    return okResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Conversion failed';
    return errorResponse('conversion_failed', message, 422, requestId);
  }
}, { limit: 180, windowMs: 60_000 });
