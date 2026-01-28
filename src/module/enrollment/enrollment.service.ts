import { prisma } from "../../lib/prisma";


export const enrollCourse = async (studentId: string, courseId: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new Error("COURSE_NOT_FOUND");
  }

  if (course.status !== "APPROVED") {
    throw new Error("COURSE_NOT_APPROVED");
  }

  const alreadyEnrolled = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId,
      },
    },
  });

  if (alreadyEnrolled) {
    throw new Error("ALREADY_ENROLLED");
  }

  return prisma.enrollment.create({
    data: {
      studentId,
      courseId,
    },
  });
};
