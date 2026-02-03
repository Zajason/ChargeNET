/*
  Warnings:

  - You are about to drop the column `batteryCapacity` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `maxChargingSpeed` on the `Car` table. All the data in the column will be lost.
  - Added the required column `acMaxKW` to the `Car` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dcChargingCurve` to the `Car` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dcMaxKW` to the `Car` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usableBatteryKWh` to the `Car` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConnectorType" ADD VALUE 'TYPE1';
ALTER TYPE "ConnectorType" ADD VALUE 'SCHUKO';

-- AlterTable
ALTER TABLE "Car" DROP COLUMN "batteryCapacity",
DROP COLUMN "maxChargingSpeed",
ADD COLUMN     "acMaxKW" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "acPorts" "ConnectorType"[],
ADD COLUMN     "dcChargingCurve" JSONB NOT NULL,
ADD COLUMN     "dcCurveIsDefault" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dcMaxKW" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "dcPorts" "ConnectorType"[],
ADD COLUMN     "usableBatteryKWh" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "variant" TEXT;
