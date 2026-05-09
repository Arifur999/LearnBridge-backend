import { prisma } from "../../lib/prisma";

export const getStudentDashboard = async (studentId: string) => {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!student) throw new Error("STUDENT_NOT_FOUND");

  const [bookings, reviews] = await Promise.all([
    prisma.booking.findMany({
      where: { studentId },
      include: {
        slot: {
          include: {
            trainer: {
              select: { id: true, name: true, email: true, trainerProfile: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    (prisma.review as any).findMany({
      where: { studentId },
      include: {
        tutor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const upcomingBookings = bookings.filter(
    (b) => b.status === "CONFIRMED" && new Date(b.slot.date) >= new Date()
  ).length;

  const completedBookings = bookings.filter((b) => b.status === "COMPLETED").length;

  return {
    student,
    stats: {
      totalBookings: bookings.length,
      upcomingBookings,
      completedBookings,
      totalReviews: reviews.length,
    },
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      date: b.slot.date,
      startTime: b.slot.startTime,
      endTime: b.slot.endTime,
      tutorName: b.slot.trainer.name,
      tutorId: b.slot.trainer.id,
    })),
    reviews: reviews.map((r: any) => ({
      id: r.id,
      tutorName: r.tutor?.name,
      tutorId: r.tutorId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
  };
};
