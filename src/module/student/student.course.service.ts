import { prisma } from "../../lib/prisma";


interface GetApprovedCoursesParams {
  page?: number;
  limit?: number;
}

export const getApprovedCourses = async ({
  page = 1,
  limit = 10,
}: GetApprovedCoursesParams) => {
  const skip = (page - 1) * limit;

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where: { status: "APPROVED" },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        price: true,
        createdAt: true,
        trainer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.course.count({
      where: { status: "APPROVED" },
    }),
  ]);

  return {
    data: courses,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
