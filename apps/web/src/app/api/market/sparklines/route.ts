import { okResponse, withRateLimit, errorResponse, withRequestId } from '@/lib/api-helpers';
import { getSparklines } from '@/lib/server-data';
import { SparklinesQuerySchema } from '@sarmaye/shared';

export const dynamic = 'force-dynamic';

export const GET = withRateLimit(async (req) => {
  const url = new URL(req.url);
  const parsed = SparklinesQuerySchema.safeParse({
    symbols: url.searchParams.get('symbols') ?? '',
    days: url.searchParams.get('days') ?? undefined,
  });
  if (!parsed.success) return errorResponse('invalid_input', 'Invalid query parameters', 400, withRequestId());
  const data = await getSparklines(parsed.data.symbols, parsed.data.days);
  return okResponse(data);
}, { limit: 120, windowMs: 60_000 });
