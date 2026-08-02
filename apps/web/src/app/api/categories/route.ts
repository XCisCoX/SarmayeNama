import { okResponse, withRateLimit } from '@/lib/api-helpers';
import { getCategories } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export const GET = withRateLimit(async () => {
  const categories = await getCategories();
  return okResponse(categories);
}, { limit: 120, windowMs: 60_000 });
