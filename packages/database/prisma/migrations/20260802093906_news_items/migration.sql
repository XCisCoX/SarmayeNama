/*
  Warnings:

  - Made the column `value` on table `SystemSetting` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "SystemSetting" ALTER COLUMN "value" SET NOT NULL,
ALTER COLUMN "value" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "publishedAt" TIMESTAMP(3),
    "lang" TEXT NOT NULL DEFAULT 'fa',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsItem_url_key" ON "NewsItem"("url");

-- CreateIndex
CREATE INDEX "NewsItem_lang_fetchedAt_idx" ON "NewsItem"("lang", "fetchedAt");
