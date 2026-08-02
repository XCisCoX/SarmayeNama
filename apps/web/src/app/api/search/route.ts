import { okResponse, withRateLimit, errorResponse, withRequestId } from '@/lib/api-helpers';
import { searchAssets } from '@/lib/server-data';
import { SearchQuerySchema } from '@sarmaye/shared';

export const dynamic = 'force-dynamic';

export const GET = withRateLimit(async (req, { requestId }) => {
  const url = new URL(req.url);
  const parsed = SearchQuerySchema.safeParse({
    q: url.searchParams.get('q') ?? '',
    limit: url.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) return errorResponse('invalid_input', 'Invalid query parameters', 400, requestId);
  const results = await searchAssets(parsed.data.q, parsed.data.limit);
  return okResponse(results);
}, { limit: 180, windowMs: 60_000 });
