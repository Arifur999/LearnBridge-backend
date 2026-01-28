import { prisma } from "../../lib/prisma";


export const getTrainerDashboard = async (trainerId: string) => {
  const courses = await prisma.course.findMany({
    where: { trainerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      price: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });

  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    category: course.category,
    price: course.price,
    status: course.status,
    createdAt: course.createdAt,
    totalEnrollments: course._count.enrollments,
  }));
};
