import { okResponse, withRateLimit, errorResponse, withRequestId } from '@/lib/api-helpers';
import { getAllAssets } from '@/lib/server-data';
import { AssetsQuerySchema } from '@sarmaye/shared';

export const dynamic = 'force-dynamic';

export const GET = withRateLimit(async (req) => {
  const url = new URL(req.url);
  const parsed = AssetsQuerySchema.safeParse({
    category: url.searchParams.get('category') ?? undefined,
    assetClass: url.searchParams.get('assetClass') ?? undefined,
    enabled: url.searchParams.get('enabled') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
  });
  if (!parsed.success) return errorResponse('invalid_input', 'Invalid query parameters', 400, withRequestId());

  let assets = await getAllAssets();
  if (parsed.data.assetClass) assets = assets.filter((a) => a.assetClass === parsed.data.assetClass);
  if (parsed.data.search) {
    const q = parsed.data.search.toLowerCase();
    assets = assets.filter(
      (a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.nameFa.includes(parsed.data.search!) ||
        a.nameEn.toLowerCase().includes(q) ||
        a.aliases.some((al) => al.toLowerCase().includes(q))
    );
  }
  const total = assets.length;
  const page = assets.slice(parsed.data.offset, parsed.data.offset + parsed.data.limit);
  return okResponse({ items: page, total, limit: parsed.data.limit, offset: parsed.data.offset });
}, { limit: 120, windowMs: 60_000 });
