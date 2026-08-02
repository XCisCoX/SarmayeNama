import { prisma } from '@sarmaye/database';
import type { Logger } from 'pino';

/**
 * Market session job: computes open/closed state for each market based on
 * Tehran/local time. Crypto is always open; FX/metals/commodities follow the
 * Mon–Fri pattern; the Iran free market and TSE follow Sat–Wed (Tehran).
 */

const DAY_MS = 86_400_000;

function tehranTime(now: Date): { day: number; minutes: number } {
  // Asia/Tehran is UTC+3:30 (no DST since 2022).
  const tehran = new Date(now.getTime() + 3.5 * 3600_000);
  return { day: tehran.getUTCDay(), minutes: tehran.getUTCHours() * 60 + tehran.getUTCMinutes() };
}

export async function runMarketSessions(log: Logger, now = new Date()): Promise<void> {
  const { day, minutes } = tehranTime(now);
  const isWeekday = day !== 5 && day !== 6; // Sat(6)..Thu(4) in Tehran week; Fri=5
  const sessions = [
    { market: 'iran_fx', isOpen: isWeekday, noteFa: 'بازار آزاد ارز ایران (شنبه تا چهارشنبه)', noteEn: 'Iran free currency market (Sat–Wed)' },
    { market: 'tsetmc', isOpen: isWeekday && minutes >= 9 * 60 && minutes <= 12 * 60 + 30, noteFa: 'بورس تهران: شنبه تا چهارشنبه ۹:۰۰ تا ۱۲:۳۰', noteEn: 'TSE: Sat–Wed 09:00–12:30' },
    { market: 'forex', isOpen: day >= 1 && day <= 5, noteFa: 'بازار ارز جهانی (دوشنبه تا جمعه)', noteEn: 'Global FX (Mon–Fri)' },
    { market: 'crypto', isOpen: true, noteFa: 'بازار رمزارز ۲۴/۷', noteEn: 'Crypto market 24/7' },
    { market: 'metals', isOpen: day >= 1 && day <= 5, noteFa: 'بازار فلزات گران‌بها (دوشنبه تا جمعه)', noteEn: 'Precious metals (Mon–Fri)' },
    { market: 'commodities', isOpen: day >= 1 && day <= 5, noteFa: 'بازار کالا (دوشنبه تا جمعه)', noteEn: 'Commodities (Mon–Fri)' },
  ];
  for (const s of sessions) {
    await prisma.marketSession.upsert({
      where: { market: s.market },
      update: { isOpen: s.isOpen, checkedAt: now, noteFa: s.noteFa, noteEn: s.noteEn },
      create: { market: s.market, isOpen: s.isOpen, checkedAt: now, timezone: 'Asia/Tehran', noteFa: s.noteFa, noteEn: s.noteEn },
    });
  }
}

export async function runPrune(retentionDays: number, providerIds: string[], log: Logger): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS);
  const result = await prisma.quoteSnapshot.deleteMany({
    where: { receivedAt: { lt: cutoff }, providerId: { in: providerIds } },
  });
  if (result.count > 0) log.info({ deleted: result.count, retentionDays }, 'snapshots pruned');
  return result.count;
}
