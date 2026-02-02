import { prisma } from "../../lib/prisma";

const createSlotIntoDB = async (payload: {
  trainerId: string;
  date: string;
  startTime: string;
  endTime: string;
}) => {
  const result = await prisma.slot.create({
    data: {
      trainerId: payload.trainerId,
      date: payload.date,   
      startTime: payload.startTime, 
      endTime: payload.endTime,    
      isBooked: false,
    },
  });
  return result;
};

const createBookingIntoDB = async (studentId: string, slotId: string) => {
 
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    throw new Error("SLOT_NOT_FOUND");
  }

  if (slot.isBooked) {
    throw new Error("SLOT_ALREADY_BOOKED");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Booking create kora
    const booking = await tx.booking.create({
      data: {
        studentId,
        slotId,
        status: "CONFIRMED",
      },
    });

    await tx.slot.update({
      where: { id: slotId },
      data: { isBooked: true },
    });

    return booking;
  });

  return result;
};

export const BookingService = {
  createSlotIntoDB,
  createBookingIntoDB,
};