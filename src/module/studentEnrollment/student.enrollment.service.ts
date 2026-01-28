import { prisma } from "../../lib/prisma";


interface Params {
  studentId: string;
  page?: number;
  limit?: number;
}

export const getMyEnrollments = async ({
  studentId,
  page = 1,
  limit = 10,
}: Params) => {
  const skip = (page - 1) * limit;

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            price: true,
            trainer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.enrollment.count({ where: { studentId } }),
  ]);

  return {
    data: enrollments,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
