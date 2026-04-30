import { prisma } from "../../lib/prisma";

export const getStudentDashboard = async (studentId: string) => {
  // Get student info
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!student) {
    throw new Error("STUDENT_NOT_FOUND");
  }

  // Get enrollments with course info
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      course: {
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              enrollments: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get bookings with slot and trainer info
  const bookings = await prisma.booking.findMany({
    where: { studentId },
    include: {
      slot: {
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Get reviews given by student
  const reviews = await prisma.review.findMany({
    where: { studentId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate stats
  const totalEnrollments = enrollments.length;
  const totalBookings = bookings.length;
  const upcomingBookings = bookings.filter(
    (b) => b.status === "CONFIRMED" && new Date(b.slot.date) >= new Date()
  ).length;
  const completedBookings = bookings.filter(
    (b) => b.status === "CONFIRMED" && new Date(b.slot.date) < new Date()
  ).length;

  return {
    student,
    stats: {
      totalEnrollments,
      totalBookings,
      upcomingBookings,
      completedBookings,
      totalReviews: reviews.length,
    },
    enrollments: enrollments.map((e) => ({
      id: e.id,
      courseId: e.course.id,
      courseTitle: e.course.title,
      courseCategory: e.course.category,
      coursePrice: e.course.price,
      trainerName: e.course.trainer.name,
      enrolledAt: e.createdAt,
    })),
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      date: b.slot.date,
      startTime: b.slot.startTime,
      endTime: b.slot.endTime,
      trainerName: b.slot.trainer.name,
    })),
    reviews: reviews.map((r) => ({
      id: r.id,
      courseTitle: r.course.title,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
  };
};