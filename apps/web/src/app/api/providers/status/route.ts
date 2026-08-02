import { okResponse, withRateLimit } from '@/lib/api-helpers';
import { getProviderStatuses } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export const GET = withRateLimit(async () => {
  const statuses = await getProviderStatuses();
  return okResponse(statuses);
}, { limit: 120, windowMs: 60_000 });
