import { okResponse, withRateLimit, errorResponse, withRequestId } from '@/lib/api-helpers';
import { getAssetDetail } from '@/lib/server-data';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ParamsSchema = z.object({ symbol: z.string().min(1).max(64) });

export const GET = withRateLimit(async (req, { requestId }) => {
  const url = new URL(req.url);
  const symbol = url.pathname.split('/').filter(Boolean).pop() ?? '';
  const parsed = ParamsSchema.safeParse({ symbol });
  if (!parsed.success) return errorResponse('invalid_input', 'Invalid symbol', 400, requestId);
  const detail = await getAssetDetail(parsed.data.symbol.toUpperCase());
  if (!detail.asset) return errorResponse('not_found', `Asset ${parsed.data.symbol} not found`, 404, requestId);
  return okResponse(detail.quote);
}, { limit: 120, windowMs: 60_000 });
