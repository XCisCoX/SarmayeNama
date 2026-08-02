# Backup & Restore

## What to back up

- PostgreSQL database (`sarmaye` schema) — quotes, snapshots, candles, config.
- `.env` — configuration and API keys (keep it secret).

Raw snapshots older than `SNAPSHOT_RETENTION_DAYS` (default 90) are pruned
automatically; candles (aggregated history) are never pruned, so a backup
restored after 90 days still shows full charts.

## Backup (pg_dump)

```bash
docker exec sarmaye-db pg_dump -U sarmaye -d sarmaye -Fc -f /tmp/sarmaye.dump
docker cp sarmaye-db:/tmp/sarmaye.dump ./sarmaye-$(date +%F).dump
```

For a plain SQL dump (easier to inspect):

```bash
docker exec sarmaye-db pg_dump -U sarmaye -d sarmaye > sarmaye-$(date +%F).sql
```

### Cron example (daily 02:00, keep 14 days)

```cron
0 2 * * * cd /opt/sarmaye && docker exec sarmaye-db pg_dump -U sarmaye -d sarmaye -Fc -f /tmp/sarmaye.dump && docker cp sarmaye-db:/tmp/sarmaye.dump backups/sarmaye-$(date +\%F).dump && find backups -name '*.dump' -mtime +14 -delete
```

## Restore

```bash
# 1. stop the app (optional but recommended)
docker compose stop web worker

# 2. restore into a fresh database
docker exec -i sarmaye-db pg_restore -U sarmaye -d sarmaye --clean --if-exists < sarmaye-2026-08-02.dump
# or with a plain SQL dump:
docker exec -i sarmaye-db psql -U sarmaye -d sarmaye < sarmaye-2026-08-02.sql

# 3. start again
docker compose start web worker
```

The web container runs migrations + seed on startup, which reconciles any
schema drift (seed is idempotent and will re-add missing assets if needed).

## Restore to a brand-new VPS

1. `cp .env.example .env` and fill secrets.
2. `docker compose up -d db` and wait for healthy.
3. Restore the dump into the `sarmaye` database as above.
4. `docker compose up -d --build` for web + worker.

## Data volume

The named volume `sarmaye-pgdata` holds PostgreSQL data. It survives container
recreates; only `docker compose down -v` deletes it (destructive).
