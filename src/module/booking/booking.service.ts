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
  const slot = await prisma.slot.findUnique({ where: { id: slotId } });

  if (!slot) throw new Error("SLOT_NOT_FOUND");
  if (slot.isBooked) throw new Error("SLOT_ALREADY_BOOKED");

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: { studentId, slotId, status: "CONFIRMED" as any },
      include: {
        slot: {
          include: {
            trainer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    await tx.slot.update({ where: { id: slotId }, data: { isBooked: true } });
    return booking;
  });

  return result;
};

const getMyBookingsFromDB = async (
  studentId: string,
  status?: string
) => {
  const where: any = { studentId };
  if (status) where.status = status;

  return prisma.booking.findMany({
    where,
    include: {
      slot: {
        include: {
          trainer: {
            select: { id: true, name: true, email: true, trainerProfile: true },
          },
        },
      },
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const getBookingByIdFromDB = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      slot: {
        include: {
          trainer: {
            select: { id: true, name: true, email: true, trainerProfile: true },
          },
        },
      },
      student: { select: { id: true, name: true, email: true } },
      review: true,
    },
  });

  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  // Only the student or the tutor of this booking can view it
  const isStudent = booking.studentId === userId;
  const isTutor = booking.slot.trainerId === userId;
  if (!isStudent && !isTutor) throw new Error("FORBIDDEN");

  return booking;
};

const updateBookingStatusIntoDB = async (
  bookingId: string,
  userId: string,
  userRole: string,
  newStatus: string
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: true },
  });

  if (!booking) throw new Error("BOOKING_NOT_FOUND");

  if (newStatus === "COMPLETED") {
    if (userRole !== "TRAINER") throw new Error("FORBIDDEN");
    if (booking.slot.trainerId !== userId) throw new Error("FORBIDDEN");
    if (booking.status !== "CONFIRMED") throw new Error("INVALID_STATUS_TRANSITION");
  }

  if (newStatus === "CANCELLED") {
    const isStudent = booking.studentId === userId;
    const isTutor = booking.slot.trainerId === userId;
    if (!isStudent && !isTutor) throw new Error("FORBIDDEN");
    if (booking.status === "COMPLETED") throw new Error("INVALID_STATUS_TRANSITION");
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: newStatus as any },
    include: {
      slot: {
        include: {
          trainer: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // If cancelled, free up the slot
  if (newStatus === "CANCELLED") {
    await prisma.slot.update({
      where: { id: booking.slotId },
      data: { isBooked: false },
    });
  }

  return updated;
};

const getTutorBookingsFromDB = async (tutorId: string, status?: string) => {
  const where: any = { slot: { trainerId: tutorId } };
  if (status) where.status = status;

  return prisma.booking.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, email: true } },
      slot: true,
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const getTutorSlotsFromDB = async (tutorId: string) => {
  return prisma.slot.findMany({
    where: { trainerId: tutorId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
};

const getPublicTutorSlotsFromDB = async (tutorId: string) => {
  return prisma.slot.findMany({
    where: { trainerId: tutorId, isBooked: false },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
};

export const BookingService = {
  createSlotIntoDB,
  createBookingIntoDB,
  getMyBookingsFromDB,
  getBookingByIdFromDB,
  updateBookingStatusIntoDB,
  getTutorBookingsFromDB,
  getTutorSlotsFromDB,
  getPublicTutorSlotsFromDB,
};
