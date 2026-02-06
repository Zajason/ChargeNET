/*
  Warnings:

  - You are about to drop the column `zone` on the `Charger` table. All the data in the column will be lost.
  - You are about to drop the `PriceHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WholesalePrice` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PriceHistory" DROP CONSTRAINT "PriceHistory_chargerId_fkey";

-- AlterTable
ALTER TABLE "Charger" DROP COLUMN "zone";

-- DropTable
DROP TABLE "public"."PriceHistory";

-- DropTable
DROP TABLE "public"."WholesalePrice";

-- CreateTable
CREATE TABLE "WholesalePricePoint" (
    "id" SERIAL NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "priceEurPerKWh" DECIMAL(8,5) NOT NULL,

    CONSTRAINT "WholesalePricePoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WholesalePricePoint_ts_key" ON "WholesalePricePoint"("ts");
