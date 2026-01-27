import { prisma } from "../../lib/prisma";


export const getPendingCourses = async () => {
  return prisma.course.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      title: true,
      category: true,
      price: true,
      createdAt: true,
      trainer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const updateCourseStatus = async (
  courseId: string,
  status: "APPROVED" | "REJECTED"
) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new Error("NOT_FOUND");
  }

  if (course.status !== "PENDING") {
    throw new Error("NOT_PENDING");
  }

  return prisma.course.update({
    where: { id: courseId },
    data: { status },
  });
};
