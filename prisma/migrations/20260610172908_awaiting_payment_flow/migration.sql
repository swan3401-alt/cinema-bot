-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'AWAITING_PAYMENT';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "reviewMsgId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_telegramId_status_idx" ON "Booking"("telegramId", "status");
