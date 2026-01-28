import { prisma } from "../../lib/prisma";


export const getAdminDashboardStats = async () => {
  const [
    totalUsers,
    totalTrainers,
    pendingTrainers,
    totalCourses,
    pendingCourses,
    totalEnrollments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "TRAINER" } }),
    prisma.user.count({ where: { role: "TRAINER", status: "PENDING" } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: "PENDING" } }),
    prisma.enrollment.count(),
  ]);

  return {
    totalUsers,
    totalTrainers,
    pendingTrainers,
    totalCourses,
    pendingCourses,
    totalEnrollments,
  };
};
