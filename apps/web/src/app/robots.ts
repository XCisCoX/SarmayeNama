import type { MetadataRoute } from 'next';

const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/status?*'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
