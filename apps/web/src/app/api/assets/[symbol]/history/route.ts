import { okResponse, withRateLimit, errorResponse } from '@/lib/api-helpers';
import { getAssetHistory } from '@/lib/server-data';
import { HistoryQuerySchema } from '@sarmaye/shared';

export const dynamic = 'force-dynamic';

export const GET = withRateLimit(async (req, { requestId }) => {
  const url = new URL(req.url);
  const symbol = url.pathname.split('/').filter(Boolean)[2] ?? '';
  const parsed = HistoryQuerySchema.safeParse({
    symbol,
    range: url.searchParams.get('range') ?? undefined,
    start: url.searchParams.get('start') ?? undefined,
    end: url.searchParams.get('end') ?? undefined,
    interval: url.searchParams.get('interval') ?? undefined,
    provider: url.searchParams.get('provider') ?? undefined,
  });
  if (!parsed.success) return errorResponse('invalid_input', 'Invalid query parameters', 400, requestId);
  const range = parsed.data.range ?? '7D';
  const data = await getAssetHistory(parsed.data.symbol.toUpperCase(), range);
  if (!data) return errorResponse('not_found', `Asset ${parsed.data.symbol} not found`, 404, requestId);
  return okResponse(data);
}, { limit: 180, windowMs: 60_000 });
