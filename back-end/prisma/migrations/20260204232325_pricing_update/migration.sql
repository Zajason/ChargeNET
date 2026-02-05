-- AlterTable
ALTER TABLE "Charger" ADD COLUMN     "zone" TEXT;

-- CreateTable
CREATE TABLE "WholesalePrice" (
    "id" SERIAL NOT NULL,
    "zone" TEXT NOT NULL,
    "hourUtc" TIMESTAMP(3) NOT NULL,
    "eurPerKWh" DECIMAL(8,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WholesalePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" SERIAL NOT NULL,
    "chargerId" INTEGER NOT NULL,
    "zone" TEXT NOT NULL,
    "wholesale" DECIMAL(8,5) NOT NULL,
    "retail" DECIMAL(8,5) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WholesalePrice_zone_idx" ON "WholesalePrice"("zone");

-- CreateIndex
CREATE UNIQUE INDEX "WholesalePrice_zone_hourUtc_key" ON "WholesalePrice"("zone", "hourUtc");

-- CreateIndex
CREATE INDEX "PriceHistory_chargerId_idx" ON "PriceHistory"("chargerId");

-- CreateIndex
CREATE INDEX "PriceHistory_zone_idx" ON "PriceHistory"("zone");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
