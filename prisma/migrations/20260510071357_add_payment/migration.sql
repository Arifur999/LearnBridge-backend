/*
  Warnings:

  - The values [PENDING] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `courseId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `skills` on the `TrainerProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bookingId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tutorId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TrainerProfile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "public"."BookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';
COMMIT;

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_courseId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "courseId",
ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "tutorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TrainerProfile" DROP COLUMN "skills",
ADD COLUMN     "hourlyRate" DOUBLE PRECISION,
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "subjects" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "bookingId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
