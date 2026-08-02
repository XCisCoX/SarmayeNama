import { okResponse, withRateLimit } from '@/lib/api-helpers';
import { getNewsItems } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export const GET = withRateLimit(async (req) => {
  const lang = req.url.includes('lang=en') ? 'en' : 'fa';
  const data = await getNewsItems(lang);
  return okResponse(data);
}, { limit: 120, windowMs: 60_000 });
