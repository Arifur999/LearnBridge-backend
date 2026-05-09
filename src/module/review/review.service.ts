import { prisma } from "../../lib/prisma";

const addReviewIntoDB = async (payload: {
  studentId: string;
  tutorId: string;
  bookingId?: string;
  rating: number;
  comment: string;
}) => {
  const tutor = await prisma.user.findFirst({
    where: { id: payload.tutorId, role: "TRAINER" },
  });

  if (!tutor) {
    throw new Error("TUTOR_NOT_FOUND");
  }

  if (payload.bookingId) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: payload.bookingId,
        studentId: payload.studentId,
        status: "COMPLETED" as any,
      },
    });

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND_OR_NOT_COMPLETED");
    }

    const existing = await (prisma.review as any).findUnique({
      where: { bookingId: payload.bookingId },
    });

    if (existing) {
      throw new Error("REVIEW_ALREADY_EXISTS");
    }
  }

  const result = await (prisma.review as any).create({
    data: {
      studentId: payload.studentId,
      tutorId: payload.tutorId,
      bookingId: payload.bookingId,
      rating: payload.rating,
      comment: payload.comment,
    },
  });

  return result;
};

const getReviewsByTutor = async (tutorId: string) => {
  return (prisma.review as any).findMany({
    where: { tutorId },
    include: {
      student: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const ReviewService = {
  addReviewIntoDB,
  getReviewsByTutor,
};
