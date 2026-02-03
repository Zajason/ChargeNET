/*
  Warnings:

  - You are about to drop the `Vehicle` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CarColor" AS ENUM ('RED', 'BLUE', 'YELLOW', 'WHITE', 'BLACK', 'SILVER', 'GREY', 'GREEN', 'ORANGE', 'PURPLE');

-- DropForeignKey
ALTER TABLE "public"."Vehicle" DROP CONSTRAINT "Vehicle_userId_fkey";

-- DropTable
DROP TABLE "public"."Vehicle";

-- CreateTable
CREATE TABLE "Car" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "batteryCapacity" DOUBLE PRECISION NOT NULL,
    "maxChargingSpeed" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarOwnership" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "carId" INTEGER NOT NULL,
    "color" "CarColor" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarOwnership_userId_idx" ON "CarOwnership"("userId");

-- CreateIndex
CREATE INDEX "CarOwnership_carId_idx" ON "CarOwnership"("carId");

-- AddForeignKey
ALTER TABLE "CarOwnership" ADD CONSTRAINT "CarOwnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarOwnership" ADD CONSTRAINT "CarOwnership_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
