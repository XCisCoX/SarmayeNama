import type { MetadataRoute } from 'next';
import { prisma } from '@sarmaye/database';

const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const assets = await prisma.asset.findMany({ where: { enabled: true }, select: { symbol: true, updatedAt: true } });
  const staticEntries: MetadataRoute.Sitemap = [
    { url: origin, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${origin}/converter`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${origin}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${origin}/status`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
  ];
  const assetEntries: MetadataRoute.Sitemap = assets.map((a) => ({
    url: `${origin}/assets/${a.symbol}`,
    lastModified: a.updatedAt,
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  }));
  const categorySlugs = [
    'iranian-currencies',
    'iranian-gold-coins',
    'global-currencies',
    'precious-metals',
    'cryptocurrencies',
    'iranian-stocks',
    'global-markets',
    'economic-indicators',
  ];
  const categoryEntries: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${origin}/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));
  return [...staticEntries, ...categoryEntries, ...assetEntries];
}
