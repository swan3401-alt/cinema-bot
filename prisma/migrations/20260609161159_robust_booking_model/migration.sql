/*
  Warnings:

  - You are about to drop the column `isBooked` on the `Seat` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'EXPIRED';

-- DropIndex
DROP INDEX "Booking_seatId_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Seat" DROP COLUMN "isBooked";

-- CreateIndex
CREATE INDEX "Booking_seatId_status_idx" ON "Booking"("seatId", "status");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");
