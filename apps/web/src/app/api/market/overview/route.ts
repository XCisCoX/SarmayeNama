import { okResponse, withRateLimit, errorResponse, withRequestId } from '@/lib/api-helpers';
import { getOverview } from '@/lib/server-data';
import { OverviewQuerySchema } from '@sarmaye/shared';

export const dynamic = 'force-dynamic';

export const GET = withRateLimit(async (req) => {
  const url = new URL(req.url);
  const parsed = OverviewQuerySchema.safeParse({
    lang: url.searchParams.get('lang') ?? undefined,
  });
  if (!parsed.success) return errorResponse('invalid_input', 'Invalid query parameters', 400, withRequestId());
  const data = await getOverview(parsed.data.lang ?? 'fa');
  return okResponse(data);
}, { limit: 120, windowMs: 60_000 });
